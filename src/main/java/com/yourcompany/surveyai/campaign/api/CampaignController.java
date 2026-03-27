package com.yourcompany.surveyai.campaign.api;

import com.yourcompany.surveyai.campaign.application.dto.request.CreateCampaignRequest;
import com.yourcompany.surveyai.campaign.application.dto.response.CampaignResponseDto;
import com.yourcompany.surveyai.campaign.application.service.CampaignService;
import jakarta.validation.Valid;
import java.net.URI;
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
@RequestMapping("/api/v1/companies/{companyId}/campaigns")
public class CampaignController {

    private final CampaignService campaignService;

    public CampaignController(CampaignService campaignService) {
        this.campaignService = campaignService;
    }

    @PostMapping
    public ResponseEntity<CampaignResponseDto> createCampaign(
            @PathVariable UUID companyId,
            @Valid @RequestBody CreateCampaignRequest request
    ) {
        CampaignResponseDto response = campaignService.createCampaign(companyId, request);

        return ResponseEntity.created(URI.create("/api/v1/companies/" + companyId + "/campaigns/" + response.id()))
                .body(response);
    }

    @GetMapping("/{campaignId}")
    public ResponseEntity<CampaignResponseDto> getCampaignById(
            @PathVariable UUID companyId,
            @PathVariable UUID campaignId
    ) {
        return ResponseEntity.ok(campaignService.getCampaignById(companyId, campaignId));
    }

    @GetMapping
    public ResponseEntity<List<CampaignResponseDto>> listCampaignsByCompany(@PathVariable UUID companyId) {
        return ResponseEntity.ok(campaignService.listCampaignsByCompany(companyId));
    }
}
