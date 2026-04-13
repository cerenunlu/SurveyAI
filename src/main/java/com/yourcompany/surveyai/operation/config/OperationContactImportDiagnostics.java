package com.yourcompany.surveyai.operation.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class OperationContactImportDiagnostics {

    private static final Logger log = LoggerFactory.getLogger(OperationContactImportDiagnostics.class);

    @Value("${surveyai.dev.allow-duplicate-operation-contact-phone-numbers:false}")
    private boolean allowDuplicateOperationContactPhoneNumbers;

    @PostConstruct
    void logFlags() {
        log.info(
                "Operation contact import diagnostics. allowDuplicateOperationContactPhoneNumbers={}",
                allowDuplicateOperationContactPhoneNumbers
        );
    }
}
