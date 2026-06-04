package com.yourcompany.surveyai.auth.application;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
public class AuthCookieService {

    public static final String SESSION_COOKIE_NAME = "surveyai_session";

    private final boolean secure;
    private final String sameSite;
    private final String domain;

    public AuthCookieService() {
        this(false, "Lax", "");
    }

    @Autowired
    public AuthCookieService(
            @Value("${surveyai.auth.cookie.secure:false}") boolean secure,
            @Value("${surveyai.auth.cookie.same-site:Lax}") String sameSite,
            @Value("${surveyai.auth.cookie.domain:}") String domain
    ) {
        this.secure = secure;
        this.sameSite = hasText(sameSite) ? sameSite.trim() : "Lax";
        this.domain = hasText(domain) ? domain.trim() : null;
    }

    public String extractSessionToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (SESSION_COOKIE_NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }

    public String buildSessionCookie(String token, long maxAgeSeconds) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(SESSION_COOKIE_NAME, token)
                .httpOnly(true)
                .sameSite(sameSite)
                .secure(secure)
                .path("/")
                .maxAge(maxAgeSeconds);
        if (domain != null) {
            builder.domain(domain);
        }
        return builder.build().toString();
    }

    public String buildExpiredSessionCookie() {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(SESSION_COOKIE_NAME, "")
                .httpOnly(true)
                .sameSite(sameSite)
                .secure(secure)
                .path("/")
                .maxAge(0);
        if (domain != null) {
            builder.domain(domain);
        }
        return builder.build().toString();
    }

    public HttpHeaders withSessionCookie(String cookieValue) {
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.SET_COOKIE, cookieValue);
        return headers;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
