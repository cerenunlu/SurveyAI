package com.yourcompany.surveyai.common.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.yourcompany.surveyai.auth.api.AuthInterceptor;
import com.yourcompany.surveyai.auth.application.AuthCookieService;
import com.yourcompany.surveyai.auth.application.AuthService;
import com.yourcompany.surveyai.auth.config.AuthWebMvcConfigurer;
import com.yourcompany.surveyai.common.domain.entity.AppUser;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.Environment;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = HealthController.class)
@Import({AuthWebMvcConfigurer.class, AuthInterceptor.class, GlobalExceptionHandler.class})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void apiHealthIsPublic() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @TestConfiguration
    static class TestBeans {

        @Bean
        AuthCookieService authCookieService() {
            return new AuthCookieService();
        }

        @Bean
        AuthService authService() {
            return new AuthService(null, null, null) {
                @Override
                public Optional<AppUser> resolveAuthenticatedUser(String rawSessionToken) {
                    return Optional.empty();
                }
            };
        }

        @Bean
        Environment environment() {
            return new StandardEnvironment();
        }
    }
}
