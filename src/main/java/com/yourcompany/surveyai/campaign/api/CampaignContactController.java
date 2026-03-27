package com.yourcompany.surveyai.campaign.api;

import com.yourcompany.surveyai.campaign.application.dto.request.UploadCampaignContactsRequest;
import com.yourcompany.surveyai.campaign.application.dto.response.CampaignContactResponseDto;
import com.yourcompany.surveyai.campaign.application.service.CampaignContactService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/companies/{companyId}/campaigns/{campaignId}/contacts")
public class CampaignContactController {

    private final CampaignContactService campaignContactService;

    public CampaignContactController(CampaignContactService campaignContactService) {
        this.campaignContactService = campaignContactService;
    }

    @PostMapping
    public ResponseEntity<List<CampaignContactResponseDto>> uploadContacts(
            @PathVariable UUID companyId,
            @PathVariable UUID campaignId,
            @Valid @RequestBody UploadCampaignContactsRequest request
    ) {
        return ResponseEntity.ok(campaignContactService.uploadContacts(companyId, campaignId, request));
    }

    @GetMapping
    public ResponseEntity<List<CampaignContactResponseDto>> listContacts(
            @PathVariable UUID companyId,
            @PathVariable UUID campaignId
    ) {
        return ResponseEntity.ok(campaignContactService.listContacts(companyId, campaignId));
    }
}
