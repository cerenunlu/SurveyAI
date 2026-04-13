package com.yourcompany.surveyai;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SurveyAiApplication {

    public static void main(String[] args) {
        SpringApplication.run(SurveyAiApplication.class, args);
    }
}
