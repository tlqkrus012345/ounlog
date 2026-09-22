package ounlog.saju.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ounlog.saju.controller.request.SajuAnalysisRequest;
import ounlog.saju.controller.request.SajuPreviewRequest;
import ounlog.saju.controller.response.SajuAnalysisResponse;
import ounlog.saju.controller.response.SajuPreviewResponse;
import ounlog.saju.service.SajuService;
import ounlog.saju.service.result.SajuAnalysisResult;
import ounlog.saju.service.result.SajuPreviewResult;

@RestController
@RequestMapping("/v1/saju")
@RequiredArgsConstructor
public class SajuController implements SajuApi {

    private final SajuService sajuService;

    @Override
    @PostMapping("/previews")
    public ResponseEntity<SajuPreviewResponse> preview(@Valid @RequestBody SajuPreviewRequest request) {
        SajuPreviewResult result = sajuService.preview(request.toCommand());
        return ResponseEntity.status(HttpStatus.OK).body(SajuPreviewResponse.from(result));
    }

    @Override
    @PostMapping("/analysis")
    public ResponseEntity<SajuAnalysisResponse> sajuAnalysis(
            @AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SajuAnalysisRequest request) {
        SajuAnalysisResult result = sajuService.sajuAnalysis(request.toCommand(), Long.valueOf(jwt.getSubject()));
        return ResponseEntity.status(HttpStatus.CREATED).body(SajuAnalysisResponse.from(result));
    }
}
