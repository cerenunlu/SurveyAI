package com.yourcompany.surveyai.common.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

public class DatabaseUrlEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    private static final String PROPERTY_SOURCE_NAME = "databaseUrl";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        if (hasText(System.getenv("SPRING_DATASOURCE_URL"))) {
            return;
        }

        String databaseUrl = System.getenv("DATABASE_URL");
        if (!hasText(databaseUrl) || !isPostgresUrl(databaseUrl)) {
            return;
        }

        DatabaseConnectionProperties properties = parseDatabaseUrl(databaseUrl);
        Map<String, Object> source = new LinkedHashMap<>();
        source.put("spring.datasource.url", properties.jdbcUrl());
        if (hasText(properties.username())) {
            source.put("spring.datasource.username", properties.username());
        }
        if (hasText(properties.password())) {
            source.put("spring.datasource.password", properties.password());
        }

        environment.getPropertySources().addFirst(new MapPropertySource(PROPERTY_SOURCE_NAME, source));
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    private static boolean isPostgresUrl(String value) {
        return value.startsWith("postgres://") || value.startsWith("postgresql://");
    }

    private static DatabaseConnectionProperties parseDatabaseUrl(String value) {
        URI uri = URI.create(value);
        String scheme = uri.getScheme();
        if (!"postgres".equals(scheme) && !"postgresql".equals(scheme)) {
            throw new IllegalArgumentException("DATABASE_URL must use postgres:// or postgresql://");
        }

        String host = uri.getHost();
        if (!hasText(host)) {
            throw new IllegalArgumentException("DATABASE_URL must include a host");
        }

        String database = trimLeadingSlash(uri.getPath());
        if (!hasText(database)) {
            throw new IllegalArgumentException("DATABASE_URL must include a database name");
        }

        StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://").append(host);
        if (uri.getPort() > 0) {
            jdbcUrl.append(':').append(uri.getPort());
        }
        jdbcUrl.append('/').append(database);
        if (hasText(uri.getRawQuery())) {
            jdbcUrl.append('?').append(uri.getRawQuery());
        }

        Credentials credentials = parseCredentials(uri.getRawUserInfo());
        return new DatabaseConnectionProperties(jdbcUrl.toString(), credentials.username(), credentials.password());
    }

    private static Credentials parseCredentials(String rawUserInfo) {
        if (!hasText(rawUserInfo)) {
            return new Credentials(null, null);
        }

        int separator = rawUserInfo.indexOf(':');
        if (separator < 0) {
            return new Credentials(decode(rawUserInfo), null);
        }
        return new Credentials(
                decode(rawUserInfo.substring(0, separator)),
                decode(rawUserInfo.substring(separator + 1))
        );
    }

    private static String trimLeadingSlash(String value) {
        if (value == null) {
            return null;
        }
        return value.startsWith("/") ? value.substring(1) : value;
    }

    private static String decode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record DatabaseConnectionProperties(String jdbcUrl, String username, String password) {
    }

    private record Credentials(String username, String password) {
    }
}
