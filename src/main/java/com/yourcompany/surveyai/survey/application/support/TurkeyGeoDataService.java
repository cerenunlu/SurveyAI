package com.yourcompany.surveyai.survey.application.support;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Component
public class TurkeyGeoDataService {

    private static final String CITY_RESOURCE = "data/geo/turkey-city-list.json";
    private static final String NEIGHBOURHOOD_RESOURCE = "data/geo/turkey-neighbourhoods-by-district-and-city-code.json";
    private static final Set<String> NEIGHBOURHOOD_SUFFIXES = Set.of("mah", "mahalle", "mahallesi");

    private final ObjectMapper objectMapper;

    private Map<String, CityEntry> citiesByCode = Map.of();
    private List<DistrictEntry> allDistricts = List.of();
    private List<NeighbourhoodEntry> allNeighbourhoods = List.of();
    private Map<String, List<DistrictEntry>> districtsByCityCode = Map.of();
    private Map<String, List<NeighbourhoodEntry>> neighbourhoodsByCityAndDistrict = Map.of();
    private Map<String, Set<String>> cityCodesByNormalizedName = Map.of();

    public TurkeyGeoDataService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    void load() {
        List<CityPayload> cityPayloads = readResource(CITY_RESOURCE, new TypeReference<>() {
        });
        Map<String, Map<String, List<String>>> rawNeighbourhoods = readResource(NEIGHBOURHOOD_RESOURCE, new TypeReference<>() {
        });

        Map<String, CityEntry> loadedCitiesByCode = new LinkedHashMap<>();
        for (CityPayload payload : cityPayloads) {
            if (payload.code == null || payload.name == null) {
                continue;
            }
            CityEntry city = new CityEntry(payload.code, payload.name, buildVariants(payload.name, GeoGranularity.CITY));
            loadedCitiesByCode.put(payload.code, city);
        }

        List<DistrictEntry> loadedDistricts = new ArrayList<>();
        List<NeighbourhoodEntry> loadedNeighbourhoods = new ArrayList<>();
        Map<String, List<DistrictEntry>> loadedDistrictsByCityCode = new LinkedHashMap<>();
        Map<String, List<NeighbourhoodEntry>> loadedNeighbourhoodsByCityAndDistrict = new LinkedHashMap<>();

        for (Map.Entry<String, Map<String, List<String>>> cityEntry : rawNeighbourhoods.entrySet()) {
            String cityCode = cityEntry.getKey();
            CityEntry city = loadedCitiesByCode.get(cityCode);
            if (city == null || cityEntry.getValue() == null) {
                continue;
            }

            List<DistrictEntry> districtEntries = new ArrayList<>();
            for (Map.Entry<String, List<String>> districtEntry : cityEntry.getValue().entrySet()) {
                String districtName = districtEntry.getKey();
                if (districtName == null || districtName.isBlank()) {
                    continue;
                }

                DistrictEntry district = new DistrictEntry(
                        city.code(),
                        city.name(),
                        districtName,
                        buildVariants(districtName, GeoGranularity.DISTRICT)
                );
                districtEntries.add(district);
                loadedDistricts.add(district);

                List<NeighbourhoodEntry> neighbourhoodEntries = new ArrayList<>();
                if (districtEntry.getValue() != null) {
                    for (String neighbourhoodName : districtEntry.getValue()) {
                        if (neighbourhoodName == null || neighbourhoodName.isBlank()) {
                            continue;
                        }
                        NeighbourhoodEntry neighbourhood = new NeighbourhoodEntry(
                                city.code(),
                                city.name(),
                                district.name(),
                                neighbourhoodName,
                                buildVariants(neighbourhoodName, GeoGranularity.NEIGHBOURHOOD)
                        );
                        neighbourhoodEntries.add(neighbourhood);
                        loadedNeighbourhoods.add(neighbourhood);
                    }
                }

                loadedNeighbourhoodsByCityAndDistrict.put(
                        compoundDistrictKey(city.code(), normalize(district.name())),
                        List.copyOf(neighbourhoodEntries)
                );
            }
            loadedDistrictsByCityCode.put(city.code(), List.copyOf(districtEntries));
        }

        this.citiesByCode = Map.copyOf(loadedCitiesByCode);
        this.allDistricts = List.copyOf(loadedDistricts);
        this.allNeighbourhoods = List.copyOf(loadedNeighbourhoods);
        this.districtsByCityCode = Map.copyOf(loadedDistrictsByCityCode);
        this.neighbourhoodsByCityAndDistrict = Map.copyOf(loadedNeighbourhoodsByCityAndDistrict);
        Map<String, Set<String>> loadedCityCodesByNormalizedName = new LinkedHashMap<>();
        for (CityEntry city : loadedCitiesByCode.values()) {
            String normalizedName = normalize(city.name());
            Set<String> merged = new LinkedHashSet<>(loadedCityCodesByNormalizedName.getOrDefault(normalizedName, Set.of()));
            merged.add(city.code());
            loadedCityCodesByNormalizedName.put(normalizedName, Set.copyOf(merged));
        }
        this.cityCodesByNormalizedName = Map.copyOf(loadedCityCodesByNormalizedName);
    }

    public Collection<CityEntry> getCities() {
        return citiesByCode.values();
    }

    public Set<String> detectCityCodes(String text) {
        String normalizedText = normalize(text);
        if (normalizedText.isBlank()) {
            return Set.of();
        }

        Set<String> cityCodes = new LinkedHashSet<>();
        for (CityEntry city : citiesByCode.values()) {
            for (String variant : city.variants()) {
                if (containsPhrase(normalizedText, variant)) {
                    cityCodes.add(city.code());
                    break;
                }
            }
        }
        return Set.copyOf(cityCodes);
    }

    public List<DistrictEntry> detectDistricts(String text, Set<String> preferredCityCodes) {
        String normalizedText = normalize(text);
        if (normalizedText.isBlank()) {
            return List.of();
        }

        List<DistrictEntry> candidates = preferredCityCodes == null || preferredCityCodes.isEmpty()
                ? allDistricts
                : preferredCityCodes.stream()
                        .map(code -> districtsByCityCode.getOrDefault(code, List.of()))
                        .flatMap(Collection::stream)
                        .toList();

        List<DistrictEntry> matches = new ArrayList<>();
        for (DistrictEntry district : candidates) {
            for (String variant : district.variants()) {
                if (containsPhrase(normalizedText, variant)) {
                    matches.add(district);
                    break;
                }
            }
        }
        return distinctDistricts(matches);
    }

    public GeoMatchResult match(String utterance, GeoScope scope) {
        if (scope == null || scope.granularity() == null) {
            return GeoMatchResult.noMatch();
        }

        String normalizedUtterance = normalize(utterance);
        if (normalizedUtterance.isBlank()) {
            return GeoMatchResult.noMatch();
        }

        List<GeoCandidate> candidates = switch (scope.granularity()) {
            case CITY -> buildCityCandidates(scope);
            case DISTRICT -> buildDistrictCandidates(scope);
            case NEIGHBOURHOOD -> buildNeighbourhoodCandidates(scope);
        };
        if (candidates.isEmpty()) {
            return GeoMatchResult.noMatch();
        }

        List<ScoredCandidate> scored = new ArrayList<>();
        for (GeoCandidate candidate : candidates) {
            double score = scoreCandidate(normalizedUtterance, candidate);
            if (score > 0.30d) {
                scored.add(new ScoredCandidate(candidate, score));
            }
        }
        scored.sort((left, right) -> Double.compare(right.score(), left.score()));
        if (scored.isEmpty()) {
            return GeoMatchResult.noMatch();
        }

        ScoredCandidate best = scored.getFirst();
        ScoredCandidate second = scored.size() > 1 ? scored.get(1) : null;
        boolean confident = best.score() >= 0.93d
                || (best.score() >= 0.82d && (second == null || best.score() - second.score() >= 0.12d));
        List<String> clarificationLabels = scored.stream()
                .map(item -> item.candidate().label())
                .filter(Objects::nonNull)
                .distinct()
                .limit(3)
                .toList();
        return new GeoMatchResult(
                confident,
                best.candidate(),
                best.score(),
                clarificationLabels
        );
    }

    public Set<String> resolveCityCodesByNames(Collection<String> cityNames) {
        if (cityNames == null || cityNames.isEmpty()) {
            return Set.of();
        }
        Set<String> result = new LinkedHashSet<>();
        for (String cityName : cityNames) {
            String normalized = normalize(cityName);
            if (normalized.isBlank()) {
                continue;
            }
            result.addAll(cityCodesByNormalizedName.getOrDefault(normalized, Set.of()));
        }
        return Set.copyOf(result);
    }

    private List<GeoCandidate> buildCityCandidates(GeoScope scope) {
        Collection<CityEntry> source = scope.cityCodes() == null || scope.cityCodes().isEmpty()
                ? citiesByCode.values()
                : scope.cityCodes().stream()
                        .map(citiesByCode::get)
                        .filter(Objects::nonNull)
                        .toList();
        return source.stream()
                .map(city -> new GeoCandidate(GeoGranularity.CITY, city.name(), city.code(), null, city.variants()))
                .toList();
    }

    private List<GeoCandidate> buildDistrictCandidates(GeoScope scope) {
        Collection<DistrictEntry> source = scope.cityCodes() == null || scope.cityCodes().isEmpty()
                ? allDistricts
                : scope.cityCodes().stream()
                        .map(code -> districtsByCityCode.getOrDefault(code, List.of()))
                        .flatMap(Collection::stream)
                        .toList();
        return source.stream()
                .map(district -> new GeoCandidate(
                        GeoGranularity.DISTRICT,
                        district.name(),
                        district.cityCode(),
                        district.name(),
                        district.variants()
                ))
                .toList();
    }

    private List<GeoCandidate> buildNeighbourhoodCandidates(GeoScope scope) {
        List<NeighbourhoodEntry> source = new ArrayList<>();
        Set<String> normalizedDistricts = scope.districtNames() == null
                ? Set.of()
                : scope.districtNames().stream().map(this::normalize).collect(Collectors.toCollection(LinkedHashSet::new));

        if (scope.cityCodes() == null || scope.cityCodes().isEmpty()) {
            if (normalizedDistricts.isEmpty()) {
                return List.of();
            }
            for (NeighbourhoodEntry entry : allNeighbourhoods) {
                if (normalizedDistricts.contains(normalize(entry.districtName()))) {
                    source.add(entry);
                }
            }
        } else {
            for (String cityCode : scope.cityCodes()) {
                List<DistrictEntry> districts = districtsByCityCode.getOrDefault(cityCode, List.of());
                for (DistrictEntry district : districts) {
                    if (!normalizedDistricts.isEmpty() && !normalizedDistricts.contains(normalize(district.name()))) {
                        continue;
                    }
                    source.addAll(neighbourhoodsByCityAndDistrict.getOrDefault(
                            compoundDistrictKey(cityCode, normalize(district.name())),
                            List.of()
                    ));
                }
            }
        }

        return source.stream()
                .map(entry -> new GeoCandidate(
                        GeoGranularity.NEIGHBOURHOOD,
                        entry.name(),
                        entry.cityCode(),
                        entry.districtName(),
                        entry.variants()
                ))
                .toList();
    }

    private List<DistrictEntry> distinctDistricts(List<DistrictEntry> districts) {
        Map<String, DistrictEntry> byKey = new LinkedHashMap<>();
        for (DistrictEntry district : districts) {
            byKey.putIfAbsent(compoundDistrictKey(district.cityCode(), normalize(district.name())), district);
        }
        return List.copyOf(byKey.values());
    }

    private double scoreCandidate(String normalizedUtterance, GeoCandidate candidate) {
        double bestScore = 0d;
        for (String variant : candidate.variants()) {
            if (variant.isBlank()) {
                continue;
            }
            if (normalizedUtterance.equals(variant)) {
                return 1d;
            }
            if (containsPhrase(normalizedUtterance, variant) || containsPhrase(variant, normalizedUtterance)) {
                bestScore = Math.max(bestScore, 0.96d);
            }
            double similarity = normalizedSimilarity(normalizedUtterance, variant);
            bestScore = Math.max(bestScore, similarity);
        }
        return bestScore;
    }

    private double normalizedSimilarity(String left, String right) {
        if (left.isBlank() || right.isBlank()) {
            return 0d;
        }
        if (left.equals(right)) {
            return 1d;
        }
        Set<String> leftTokens = new LinkedHashSet<>(List.of(left.split("\\s+")));
        Set<String> rightTokens = new LinkedHashSet<>(List.of(right.split("\\s+")));
        Set<String> shared = new LinkedHashSet<>(leftTokens);
        shared.retainAll(rightTokens);
        Set<String> union = new LinkedHashSet<>(leftTokens);
        union.addAll(rightTokens);
        double tokenScore = union.isEmpty() ? 0d : (double) shared.size() / union.size();
        int maxLength = Math.max(left.length(), right.length());
        double editScore = maxLength == 0 ? 1d : 1d - ((double) levenshtein(left, right) / maxLength);
        return (tokenScore * 0.45d) + (editScore * 0.55d);
    }

    private int levenshtein(String left, String right) {
        int[] previous = new int[right.length() + 1];
        int[] current = new int[right.length() + 1];
        for (int j = 0; j <= right.length(); j += 1) {
            previous[j] = j;
        }
        for (int i = 1; i <= left.length(); i += 1) {
            current[0] = i;
            for (int j = 1; j <= right.length(); j += 1) {
                int cost = left.charAt(i - 1) == right.charAt(j - 1) ? 0 : 1;
                current[j] = Math.min(
                        Math.min(current[j - 1] + 1, previous[j] + 1),
                        previous[j - 1] + cost
                );
            }
            int[] swap = previous;
            previous = current;
            current = swap;
        }
        return previous[right.length()];
    }

    private Set<String> buildVariants(String value, GeoGranularity granularity) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return Set.of();
        }

        Set<String> variants = new LinkedHashSet<>();
        variants.add(normalized);
        if (granularity == GeoGranularity.NEIGHBOURHOOD) {
            String withoutSuffix = trimNeighbourhoodSuffix(normalized);
            if (!withoutSuffix.equals(normalized)) {
                variants.add(withoutSuffix);
            }
        }

        for (String base : List.copyOf(variants)) {
            addLocationSuffixVariants(variants, base);
        }
        return Set.copyOf(variants);
    }

    private void addLocationSuffixVariants(Set<String> variants, String base) {
        if (base.isBlank()) {
            return;
        }
        variants.add(base + "de");
        variants.add(base + "da");
        variants.add(base + "den");
        variants.add(base + "dan");
        variants.add(base + "e");
        variants.add(base + "a");
        variants.add(base + "ye");
        variants.add(base + "ya");
        variants.add(base + "nin");
        variants.add(base + "nin");
        variants.add(base + "nun");
        variants.add(base + "nun");
    }

    private String trimNeighbourhoodSuffix(String normalized) {
        String result = normalized;
        for (String suffix : NEIGHBOURHOOD_SUFFIXES) {
            if (result.endsWith(" " + suffix)) {
                result = result.substring(0, result.length() - suffix.length() - 1).trim();
            } else if (result.equals(suffix)) {
                result = "";
            }
        }
        return result;
    }

    private boolean containsPhrase(String haystack, String needle) {
        if (haystack == null || needle == null || haystack.isBlank() || needle.isBlank()) {
            return false;
        }
        return (" " + haystack + " ").contains(" " + needle + " ");
    }

    private String compoundDistrictKey(String cityCode, String normalizedDistrictName) {
        return cityCode + "::" + normalizedDistrictName;
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        String lowered = value.trim().toLowerCase(Locale.ROOT)
                .replace('\u0131', 'i')
                .replace('\u0130', 'i')
                .replace('\u015f', 's')
                .replace('\u015e', 's')
                .replace('\u011f', 'g')
                .replace('\u011e', 'g')
                .replace('\u00fc', 'u')
                .replace('\u00dc', 'u')
                .replace('\u00f6', 'o')
                .replace('\u00d6', 'o')
                .replace('\u00e7', 'c')
                .replace('\u00c7', 'c')
                .replace('Ä', 'a')
                .replace('Å', 's')
                .replace('Ã', 'a');
        String decomposed = Normalizer.normalize(lowered, Normalizer.Form.NFD);
        return decomposed
                .replaceAll("\\p{M}+", "")
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private <T> T readResource(String path, TypeReference<T> typeReference) {
        try (InputStream stream = new ClassPathResource(path).getInputStream()) {
            return objectMapper.readValue(stream, typeReference);
        } catch (Exception error) {
            throw new IllegalStateException("Failed to load geo resource: " + path, error);
        }
    }

    public record GeoScope(
            GeoGranularity granularity,
            Set<String> cityCodes,
            Set<String> districtNames
    ) {
    }

    public enum GeoGranularity {
        CITY,
        DISTRICT,
        NEIGHBOURHOOD
    }

    public record GeoMatchResult(
            boolean confident,
            GeoCandidate candidate,
            double score,
            List<String> clarificationLabels
    ) {
        public static GeoMatchResult noMatch() {
            return new GeoMatchResult(false, null, 0d, List.of());
        }
    }

    public record GeoCandidate(
            GeoGranularity granularity,
            String label,
            String cityCode,
            String districtName,
            Set<String> variants
    ) {
    }

    public record CityEntry(
            String code,
            String name,
            Set<String> variants
    ) {
    }

    public record DistrictEntry(
            String cityCode,
            String cityName,
            String name,
            Set<String> variants
    ) {
    }

    public record NeighbourhoodEntry(
            String cityCode,
            String cityName,
            String districtName,
            String name,
            Set<String> variants
    ) {
    }

    private record ScoredCandidate(
            GeoCandidate candidate,
            double score
    ) {
    }

    private record CityPayload(
            String code,
            String name
    ) {
    }
}
