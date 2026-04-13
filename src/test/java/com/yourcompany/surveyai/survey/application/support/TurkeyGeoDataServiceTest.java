package com.yourcompany.surveyai.survey.application.support;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TurkeyGeoDataServiceTest {

    @Test
    void matchesDistrictWithinScopedCity() {
        TurkeyGeoDataService service = new TurkeyGeoDataService(new ObjectMapper());
        service.load();

        TurkeyGeoDataService.GeoScope scope = new TurkeyGeoDataService.GeoScope(
                TurkeyGeoDataService.GeoGranularity.DISTRICT,
                Set.of("33"),
                Set.of()
        );

        TurkeyGeoDataService.GeoMatchResult match = service.match("akdenizde oturuyorum", scope);

        assertNotNull(match.candidate());
        assertTrue(match.confident());
        assertEquals("Akdeniz", match.candidate().label());
        assertEquals("33", match.candidate().cityCode());
    }
}
