package com.yourcompany.surveyai.survey.infrastructure.googleforms;

import com.fasterxml.jackson.databind.JsonNode;
import com.yourcompany.surveyai.common.exception.ValidationException;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class HttpGoogleFormsClient implements GoogleFormsClient {

    private final RestClient restClient;

    public HttpGoogleFormsClient(RestClient.Builder restClientBuilder) {
        this.restClient = restClientBuilder
                .baseUrl("https://forms.googleapis.com")
                .build();
    }

    @Override
    public JsonNode fetchForm(String accessToken, String formId) {
        try {
            return restClient.get()
                    .uri("/v1/forms/{formId}", formId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken.trim())
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientResponseException exception) {
            if (exception.getStatusCode().value() == 401 || exception.getStatusCode().value() == 403) {
                throw new ValidationException(
                        "Google Forms erişimi reddedildi. forms.body.readonly scope'lu geçerli bir access token kullanın."
                );
            }
            if (exception.getStatusCode().value() == 404) {
                throw new ValidationException("Google Form bulunamadı veya bu token formu görme yetkisine sahip değil.");
            }
            throw new ValidationException("Google Forms içeriği alınamadı: HTTP " + exception.getStatusCode().value());
        }
    }
}
