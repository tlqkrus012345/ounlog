package ounlog.saju.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class SajuService {

    public SajuPreviewResult preview(SajuPreviewCommand command) {
        return new SajuPreviewResult("키워드", "요약 내용");
    }
}
