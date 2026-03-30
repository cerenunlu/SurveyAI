package com.yourcompany.surveyai.auth.api;

import com.yourcompany.surveyai.auth.application.AuthCookieService;
import com.yourcompany.surveyai.auth.application.AuthService;
import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import com.yourcompany.surveyai.common.domain.entity.AppUser;
import com.yourcompany.surveyai.common.exception.CompanyIsolationException;
import com.yourcompany.surveyai.common.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private static final Pattern COMPANY_PATH_PATTERN = Pattern.compile("/api/v1/companies/([0-9a-fA-F-]{36})(?:/.*)?");

    private final AuthService authService;
    private final AuthCookieService authCookieService;

    public AuthInterceptor(AuthService authService, AuthCookieService authCookieService) {
        this.authService = authService;
        this.authCookieService = authCookieService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        if ("/api/v1/auth/login".equals(path)) {
            return true;
        }

        AppUser user = authService.resolveAuthenticatedUser(authCookieService.extractSessionToken(request))
                .orElseThrow(() -> new UnauthorizedException("Authentication is required"));

        enforceCompanyScope(request, user);
        request.setAttribute(RequestAuthContext.REQUEST_USER_ATTRIBUTE, user);
        return true;
    }

    private void enforceCompanyScope(HttpServletRequest request, AppUser user) {
        UUID authenticatedCompanyId = user.getCompany().getId();
        String companyIdParam = request.getParameter("companyId");

        if (companyIdParam != null && !authenticatedCompanyId.equals(UUID.fromString(companyIdParam))) {
            throw new CompanyIsolationException("Requested company does not match authenticated company");
        }

        Matcher matcher = COMPANY_PATH_PATTERN.matcher(request.getRequestURI());
        if (matcher.matches()) {
            UUID pathCompanyId = UUID.fromString(matcher.group(1));
            if (!authenticatedCompanyId.equals(pathCompanyId)) {
                throw new CompanyIsolationException("Requested company does not match authenticated company");
            }
        }
    }
}
