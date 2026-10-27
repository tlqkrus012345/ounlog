package ounlog.saju.entity;

import java.util.List;

/** 외부 AI 응답 DTO와 독립적인, 저장된 7개 문단의 해석 계약. */
public record SajuInterpretation(
        String schemaVersion,
        Paragraph fiveElements,
        Paragraph annualOverview,
        Paragraph personality,
        Paragraph career,
        Paragraph wealth,
        Paragraph relationship,
        Paragraph currentLuck) {

    public record Paragraph(String content, List<Evidence> evidence) {
        public Paragraph {
            evidence = List.copyOf(evidence);
        }
    }

    public record Evidence(String source, String value, String interpretation) {}
}
