package ounlog.saju.external.manseryeok;

import jakarta.validation.Validator;
import java.time.temporal.ChronoUnit;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.manseryeok.request.ManseryeokCalculationRequest;
import ounlog.saju.external.manseryeok.response.ManseryeokCalculationResponse;

@Component
public class ManseryeokClient {

    private final RestClient restClient;
    private final Validator validator;

    public ManseryeokClient(@Qualifier("manseryeokRestClient") RestClient restClient, Validator validator) {
        this.restClient = restClient;
        this.validator = validator;
    }

    public ManseryeokCalculationResponse calculate(ManseryeokCalculationRequest request) {
        try {
            ManseryeokCalculationResponse response = restClient
                    .post()
                    .uri("/calculations")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(ManseryeokCalculationResponse.class);
            if (response == null || !validator.validate(response).isEmpty()) {
                throw new SajuException(SajuErrorCode.SAJU_CALCULATION_FAILED);
            }

            if (!response.context().asOf().equals(request.asOf().truncatedTo(ChronoUnit.MILLIS))) {
                throw new SajuException(SajuErrorCode.SAJU_CALCULATION_FAILED);
            }
            return response;
        } catch (RestClientException exception) {
            throw new SajuException(SajuErrorCode.SAJU_CALCULATION_FAILED, exception);
        }
    }
}
