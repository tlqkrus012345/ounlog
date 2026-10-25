package ounlog.saju;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ounlog.auth.config.SecurityConfig;
import ounlog.saju.controller.SajuController;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.service.SajuAnalysisStatus;
import ounlog.saju.service.SajuService;
import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.command.SajuPreviewCommand;
import ounlog.saju.service.result.SajuAnalysisCreateResult;
import ounlog.saju.service.result.SajuAnalysisResult;
import ounlog.saju.service.result.SajuPreviewResult;

@WebMvcTest(SajuController.class)
@Import(SecurityConfig.class)
class SajuControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    SajuService sajuService;

    @MockitoBean
    JwtDecoder jwtDecoder;

    @MockitoBean
    UserDetailsService userDetailsService;

    @MockitoBean
    PasswordEncoder passwordEncoder;

    @DisplayName("유효한 요청이면 Preview 요청 후 200 응답을 반환한다.")
    @Test
    void preview() throws Exception {
        SajuPreviewCommand command = new SajuPreviewCommand(
                LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, Gender.FEMALE, false);
        given(sajuService.preview(command)).willReturn(new SajuPreviewResult(2026, "키워드", "요약 내용"));

        mockMvc.perform(post("/v1/saju/previews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR",
                                  "gender": "FEMALE",
                                  "isLeapMonth": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.keyword").value("키워드"))
                .andExpect(jsonPath("$.summary").value("요약 내용"));

        then(sajuService).should().preview(command);
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
                              "calendarType": "SOLAR",
                              "gender": "MALE",
                              "isLeapMonth": false
                            }
                            """))
                .andExpect(status().isBadRequest());
    }

    @DisplayName("출생시간이 없으면 Preview 요청에 400을 반환한다.")
    @Test
    void previewWithNullBirthTime() throws Exception {
        mockMvc.perform(post("/v1/saju/previews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "birthDate": "2026-01-01",
                              "birthTime": null,
                              "calendarType": "SOLAR",
                              "gender": "MALE",
                              "isLeapMonth": false
                            }
                            """))
                .andExpect(status().isBadRequest());

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("성별이 없으면 Preview 요청에 400을 반환한다.")
    @Test
    void previewWithNullGender() throws Exception {
        mockMvc.perform(post("/v1/saju/previews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "birthDate": "2026-01-01",
                              "birthTime": "10:00",
                              "calendarType": "SOLAR",
                              "gender": null,
                              "isLeapMonth": false
                            }
                            """))
                .andExpect(status().isBadRequest());

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("윤달 여부가 누락되면 Preview 요청에 400을 반환한다.")
    @Test
    void previewWithoutLeapMonth() throws Exception {
        mockMvc.perform(post("/v1/saju/previews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "birthDate": "2026-01-01",
                              "birthTime": "10:00",
                              "calendarType": "LUNAR",
                              "gender": "MALE"
                            }
                            """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("isLeapMonth"))
                .andExpect(jsonPath("$.errors[0].code").value("NotNull"));

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("양력을 윤달로 요청하면 Preview 요청에 400을 반환한다.")
    @Test
    void previewWithSolarLeapMonth() throws Exception {
        mockMvc.perform(post("/v1/saju/previews")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                            {
                              "birthDate": "2026-01-01",
                              "birthTime": "10:00",
                              "calendarType": "SOLAR",
                              "gender": "MALE",
                              "isLeapMonth": true
                            }
                            """))
                .andExpect(status().isBadRequest());

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("유효한 요청일 경우 201을 반환한다.")
    @Test
    void sajuAnalysis() throws Exception {
        // given
        SajuAnalysisCommand command = new SajuAnalysisCommand(
                LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, Gender.MALE, false);
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));
        given(sajuService.sajuAnalysis(command, 1L))
                .willReturn(new SajuAnalysisCreateResult(
                        SajuAnalysisStatus.CREATED,
                        SajuTestFixtures.interpretation("운세 결과"),
                        null,
                        LocalDate.of(2026, 10, 17)));

        // when
        mockMvc.perform(post("/v1/saju/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR",
                                  "gender": "MALE",
                                  "isLeapMonth": false
                                }
                                """))
                // then
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.sajuAnalysisId").doesNotExist())
                .andExpect(jsonPath("$.result.fiveElements.content").value("운세 결과"))
                .andExpect(jsonPath("$.result.annualOverview.content").value("운세 결과"))
                .andExpect(jsonPath("$.result.personality.content").value("운세 결과"))
                .andExpect(jsonPath("$.result.career.content").value("운세 결과"))
                .andExpect(jsonPath("$.result.wealth.content").value("운세 결과"))
                .andExpect(jsonPath("$.result.relationship.content").value("운세 결과"))
                .andExpect(jsonPath("$.result.currentLuck.content").value("운세 결과"))
                .andExpect(jsonPath("$.asOfDate").value("2026-10-17"))
                .andExpect(jsonPath("$.calculationSnapshot").doesNotExist());

        then(sajuService).should().sajuAnalysis(command, 1L);
    }

    @DisplayName("이미 분석 결과가 있으면 기존 결과와 200 응답을 반환한다.")
    @Test
    void sajuAnalysisWithExistingResult() throws Exception {
        // given
        SajuAnalysisCommand command = new SajuAnalysisCommand(
                LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, Gender.MALE, false);
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));
        given(sajuService.sajuAnalysis(command, 1L))
                .willReturn(new SajuAnalysisCreateResult(
                        SajuAnalysisStatus.EXISTING,
                        SajuTestFixtures.interpretation("기존 운세 결과"),
                        null,
                        LocalDate.of(2026, 10, 17)));

        // when
        mockMvc.perform(post("/v1/saju/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR",
                                  "gender": "MALE",
                                  "isLeapMonth": false
                                }
                                """))
                // then
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.result.fiveElements.content").value("기존 운세 결과"))
                .andExpect(jsonPath("$.asOfDate").value("2026-10-17"));

        then(sajuService).should().sajuAnalysis(command, 1L);
    }

    @DisplayName("유효하지 않은 요청일 경우 400을 반환한다.")
    @Test
    void sajuAnalysisWithNull() throws Exception {
        // given
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));

        // when
        mockMvc.perform(post("/v1/saju/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": null,
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR",
                                  "gender": "MALE",
                                  "isLeapMonth": false
                                }
                                """))

                // then
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("요청 값이 올바르지 않습니다."))
                .andExpect(jsonPath("$.path").value("/v1/saju/analysis"))
                .andExpect(jsonPath("$.errors[0].field").value("birthDate"))
                .andExpect(jsonPath("$.errors[0].code").value("NotNull"));

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("출생시간이 없으면 사주 분석 요청에 400을 반환한다.")
    @Test
    void sajuAnalysisWithNullBirthTime() throws Exception {
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));

        mockMvc.perform(post("/v1/saju/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": null,
                                  "calendarType": "SOLAR",
                                  "gender": "MALE",
                                  "isLeapMonth": false
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("birthTime"))
                .andExpect(jsonPath("$.errors[0].code").value("NotNull"));

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("성별이 없으면 사주 분석 요청에 400을 반환한다.")
    @Test
    void sajuAnalysisWithNullGender() throws Exception {
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));

        mockMvc.perform(post("/v1/saju/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR",
                                  "gender": null,
                                  "isLeapMonth": false
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("gender"))
                .andExpect(jsonPath("$.errors[0].code").value("NotNull"));

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("윤달 여부가 누락되면 사주 분석 요청에 400을 반환한다.")
    @Test
    void sajuAnalysisWithoutLeapMonth() throws Exception {
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));

        mockMvc.perform(post("/v1/saju/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "LUNAR",
                                  "gender": "MALE"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("isLeapMonth"))
                .andExpect(jsonPath("$.errors[0].code").value("NotNull"));

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("양력을 윤달로 요청하면 사주 분석 요청에 400을 반환한다.")
    @Test
    void sajuAnalysisWithSolarLeapMonth() throws Exception {
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));

        mockMvc.perform(post("/v1/saju/analysis")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer access-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR",
                                  "gender": "MALE",
                                  "isLeapMonth": true
                                }
                                """))
                .andExpect(status().isBadRequest());

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("인증 되지 않은 요청일 경우 401을 반환한다.")
    @Test
    void sajuAnalysisWithUnauthenticated() throws Exception {
        // given

        // when
        mockMvc.perform(post("/v1/saju/analysis")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "birthDate": "2026-01-01",
                                  "birthTime": "10:00",
                                  "calendarType": "SOLAR",
                                  "gender": "MALE",
                                  "isLeapMonth": false
                                }
                                """))

                // then
                .andExpect(status().isUnauthorized());

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("인증된 회원이 사주 분석 결과를 조회하면 200을 반환한다.")
    @Test
    void getSajuAnalysis() throws Exception {
        // given
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));
        given(sajuService.getSajuAnalysis(1L))
                .willReturn(new SajuAnalysisResult(
                        SajuTestFixtures.interpretation("저장된 운세 결과"), null, LocalDate.of(2026, 10, 17)));

        // when
        mockMvc.perform(get("/v1/saju/analysis").header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))

                // then
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.sajuAnalysisId").doesNotExist())
                .andExpect(jsonPath("$.result.fiveElements.content").value("저장된 운세 결과"))
                .andExpect(jsonPath("$.asOfDate").value("2026-10-17"));

        then(sajuService).should().getSajuAnalysis(1L);
    }

    @DisplayName("사주 분석 결과가 없으면 404를 반환한다.")
    @Test
    void getSajuAnalysisNotFound() throws Exception {
        // given
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));
        given(sajuService.getSajuAnalysis(1L)).willThrow(new SajuException(SajuErrorCode.SAJU_ANALYSIS_NOT_FOUND));

        // when
        mockMvc.perform(get("/v1/saju/analysis").header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))

                // then
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("SAJU_ANALYSIS_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("사주 분석 결과를 찾을 수 없습니다."))
                .andExpect(jsonPath("$.path").value("/v1/saju/analysis"));

        then(sajuService).should().getSajuAnalysis(1L);
    }

    @DisplayName("인증되지 않은 사주 분석 결과 조회 요청이면 401을 반환한다.")
    @Test
    void getSajuAnalysisWithUnauthenticated() throws Exception {
        // when
        mockMvc.perform(get("/v1/saju/analysis"))

                // then
                .andExpect(status().isUnauthorized());

        then(sajuService).shouldHaveNoInteractions();
    }

    @DisplayName("구형 분석 결과는 문단을 임의 생성하지 않고 별도 필드로 반환한다.")
    @Test
    void getLegacyAnalysis() throws Exception {
        given(jwtDecoder.decode("access-token")).willReturn(jwt(1L));
        given(sajuService.getSajuAnalysis(1L)).willReturn(new SajuAnalysisResult(null, "구형 결과", null));

        mockMvc.perform(get("/v1/saju/analysis").header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.legacyResult").value("구형 결과"))
                .andExpect(jsonPath("$.result").isEmpty())
                .andExpect(jsonPath("$.asOfDate").isEmpty());
    }

    private Jwt jwt(long memberId) {
        return Jwt.withTokenValue("access-token")
                .header("alg", "RS256")
                .subject(String.valueOf(memberId))
                .claim("role", "MEMBER")
                .build();
    }
}
