package com.yourcompany.surveyai.auth.api;

import com.yourcompany.surveyai.auth.api.dto.AuthenticatedUserResponse;
import com.yourcompany.surveyai.auth.api.dto.LoginRequest;
import com.yourcompany.surveyai.auth.application.AuthCookieService;
import com.yourcompany.surveyai.auth.application.AuthService;
import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthCookieService authCookieService;
    private final RequestAuthContext requestAuthContext;

    public AuthController(
            AuthService authService,
            AuthCookieService authCookieService,
            RequestAuthContext requestAuthContext
    ) {
        this.authService = authService;
        this.authCookieService = authCookieService;
        this.requestAuthContext = requestAuthContext;
    }

    @PostMapping("/login")
    public ResponseEntity<AuthenticatedUserResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthService.LoginResult result = authService.login(request);

        return ResponseEntity.ok()
                .headers(authCookieService.withSessionCookie(
                        authCookieService.buildSessionCookie(result.sessionToken(), AuthService.SESSION_MAX_AGE_SECONDS)
                ))
                .body(result.user());
    }

    @GetMapping("/me")
    public ResponseEntity<AuthenticatedUserResponse> me() {
        return ResponseEntity.ok(authService.getCurrentUser(requestAuthContext.requireUser()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authService.logout(authCookieService.extractSessionToken(request));
        return ResponseEntity.noContent()
                .headers(authCookieService.withSessionCookie(authCookieService.buildExpiredSessionCookie()))
                .build();
    }
}
