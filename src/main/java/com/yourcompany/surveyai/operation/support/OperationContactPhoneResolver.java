package com.yourcompany.surveyai.operation.support;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;

public final class OperationContactPhoneResolver {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private OperationContactPhoneResolver() {
    }

    public static String resolveDisplayPhoneNumber(OperationContact contact) {
        if (contact == null) {
            return null;
        }
        String originalPhone = extractMetadataPhone(contact.getMetadataJson(), "originalPhoneNumber");
        return originalPhone != null && !originalPhone.isBlank() ? originalPhone : contact.getPhoneNumber();
    }

    public static String augmentMetadataWithOriginalPhone(String metadataJson, String originalPhoneNumber) {
        try {
            JsonNode root = metadataJson == null || metadataJson.isBlank()
                    ? OBJECT_MAPPER.createObjectNode()
                    : OBJECT_MAPPER.readTree(metadataJson);
            if (!root.isObject()) {
                root = OBJECT_MAPPER.createObjectNode();
            }
            ((com.fasterxml.jackson.databind.node.ObjectNode) root).put("originalPhoneNumber", originalPhoneNumber);
            return OBJECT_MAPPER.writeValueAsString(root);
        } catch (Exception error) {
            return "{\"originalPhoneNumber\":\"" + originalPhoneNumber + "\"}";
        }
    }

    private static String extractMetadataPhone(String metadataJson, String fieldName) {
        if (metadataJson == null || metadataJson.isBlank()) {
            return null;
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(metadataJson);
            if (root.hasNonNull(fieldName)) {
                String value = root.get(fieldName).asText();
                return value == null || value.isBlank() ? null : value.trim();
            }
        } catch (Exception ignored) {
            return null;
        }
        return null;
    }
}
