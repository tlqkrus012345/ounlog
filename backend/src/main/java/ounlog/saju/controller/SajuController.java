package ounlog.saju.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ounlog.saju.service.SajuPreviewResult;
import ounlog.saju.service.SajuService;

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
}
