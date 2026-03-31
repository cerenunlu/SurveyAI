package com.yourcompany.surveyai.common.api;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler(new StandardEnvironment());

    @Test
    void handleHttpMessageNotReadableReturnsBadRequest() {
        HttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest("POST", "/api/v1/dev/provider-results");
        HttpMessageNotReadableException exception = new HttpMessageNotReadableException(
                "Malformed request",
                new IllegalArgumentException("Cannot deserialize value")
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleHttpMessageNotReadable(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().message()).isEqualTo("Cannot deserialize value");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/dev/provider-results");
    }

    @Test
    void handleMissingRequestParameterReturnsBadRequest() {
        HttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/v1/operations/123/analytics");
        MissingServletRequestParameterException exception = new MissingServletRequestParameterException("companyId", "UUID");

        ResponseEntity<ApiErrorResponse> response = handler.handleMissingRequestParameter(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("Missing required request parameter: companyId");
    }

    @Test
    void handleMethodArgumentTypeMismatchReturnsBadRequest() {
        HttpServletRequest request = new org.springframework.mock.web.MockHttpServletRequest("GET", "/api/v1/operations/not-a-uuid/analytics");
        MethodArgumentTypeMismatchException exception = new MethodArgumentTypeMismatchException(
                "not-a-uuid",
                java.util.UUID.class,
                "operationId",
                null,
                new IllegalArgumentException("Invalid UUID")
        );

        ResponseEntity<ApiErrorResponse> response = handler.handleMethodArgumentTypeMismatch(exception, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().message()).isEqualTo("Invalid value for parameter: operationId");
    }
}
