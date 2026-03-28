package com.yourcompany.surveyai.operation.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class UploadOperationContactsRequest {

    @Valid
    @NotEmpty
    private List<OperationContactInput> contacts;

    public List<OperationContactInput> getContacts() {
        return contacts;
    }

    public void setContacts(List<OperationContactInput> contacts) {
        this.contacts = contacts;
    }
}
