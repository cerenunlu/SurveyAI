package com.yourcompany.surveyai.response.application.provider;

import com.yourcompany.surveyai.call.domain.enums.CallProvider;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class ProviderSurveyResultMapperRegistry {

    private final Map<CallProvider, ProviderSurveyResultMapper> mappers;

    public ProviderSurveyResultMapperRegistry(List<ProviderSurveyResultMapper> mappers) {
        this.mappers = new EnumMap<>(CallProvider.class);
        for (ProviderSurveyResultMapper mapper : mappers) {
            this.mappers.put(mapper.getProvider(), mapper);
        }
    }

    public ProviderSurveyResultMapper getRequiredMapper(CallProvider provider) {
        ProviderSurveyResultMapper mapper = mappers.get(provider);
        if (mapper == null) {
            throw new NotFoundException("Survey result mapper is not registered for provider: " + provider);
        }
        return mapper;
    }
}
