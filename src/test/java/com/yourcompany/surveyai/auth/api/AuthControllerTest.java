package com.yourcompany.surveyai.auth.api;

import static org.assertj.core.api.Assertions.assertThat;

import com.yourcompany.surveyai.auth.api.dto.AuthenticatedUserResponse;
import com.yourcompany.surveyai.auth.application.AuthCookieService;
import com.yourcompany.surveyai.auth.application.AuthService;
import com.yourcompany.surveyai.auth.application.RequestAuthContext;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

class AuthControllerTest {

    @Test
    void loginReturnsSessionCookie() {
        UUID companyId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        AuthenticatedUserResponse response = new AuthenticatedUserResponse(
                companyId,
                new AuthenticatedUserResponse.CompanySummary(
                        companyId,
                        "SurveyAI",
                        "surveyai",
                        "Europe/Istanbul",
                        "ACTIVE",
                        Map.of()
                ),
                new AuthenticatedUserResponse.UserSummary(
                        userId,
                        "user@example.com",
                        "Dev",
                        "User",
                        "Dev User",
                        "ADMIN",
                        "ACTIVE",
                        OffsetDateTime.parse("2026-03-31T12:00:00Z")
                )
        );

        AuthController controller = new AuthController(
                new TestAuthService(new AuthService.LoginResult("session-token", response)),
                new AuthCookieService(),
                new RequestAuthContext(new MockHttpServletRequest())
        );

        ResponseEntity<AuthenticatedUserResponse> result = controller.login(loginRequest());

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getHeaders().getFirst(HttpHeaders.SET_COOKIE))
                .contains(AuthCookieService.SESSION_COOKIE_NAME + "=session-token")
                .contains("HttpOnly");
        assertThat(result.getBody()).isEqualTo(response);
    }

    private static com.yourcompany.surveyai.auth.api.dto.LoginRequest loginRequest() {
        com.yourcompany.surveyai.auth.api.dto.LoginRequest request = new com.yourcompany.surveyai.auth.api.dto.LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password123");
        return request;
    }

    static class TestAuthService extends AuthService {

        private final LoginResult loginResult;

        TestAuthService(LoginResult loginResult) {
            super(null, null, null);
            this.loginResult = loginResult;
        }

        @Override
        public LoginResult login(com.yourcompany.surveyai.auth.api.dto.LoginRequest request) {
            return loginResult;
        }
    }
}
