package ounlog.saju;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ounlog.saju.controller.SajuController;
import ounlog.saju.service.SajuPreviewCommand;
import ounlog.saju.service.SajuPreviewResult;
import ounlog.saju.service.SajuService;

@WebMvcTest(SajuController.class)
class SajuControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    SajuService sajuService;

    @DisplayName("유효한 요청이면 Preview 요청 후 200 응답을 반환한다.")
    @Test
    void preview() throws Exception {
        given(sajuService.preview(any(SajuPreviewCommand.class))).willReturn(new SajuPreviewResult("키워드", "요약 내용"));

        mockMvc.perform(post("/v1/saju/previews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keyword").exists())
                .andExpect(jsonPath("$.summary").exists());
    }

    @DisplayName("생년월일이 없으면 400을 반환한다.")
    @Test
    void previewWithNullBirthDate() throws Exception {
        mockMvc.perform(post("/v1/saju/previews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "birthDate": null,
                              "birthTime": "14:32",
                              "calendarType": "SOLAR"
                            }
                            """))
                .andExpect(status().isBadRequest());
    }
}
