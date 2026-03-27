package com.yourcompany.surveyai.campaign.application.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public class UploadCampaignContactsRequest {

    @Valid
    @NotEmpty
    private List<CampaignContactInput> contacts;

    public List<CampaignContactInput> getContacts() {
        return contacts;
    }

    public void setContacts(List<CampaignContactInput> contacts) {
        this.contacts = contacts;
    }
}
