package ounlog.saju.external.manseryeok.response;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/** 천간 4개와 지지 4개의 대표 오행을 각 1개로 집계한다. */
public record ElementCounts(
        @NotNull @PositiveOrZero Integer wood,
        @NotNull @PositiveOrZero Integer fire,
        @NotNull @PositiveOrZero Integer earth,
        @NotNull @PositiveOrZero Integer metal,
        @NotNull @PositiveOrZero Integer water) {

    @JsonIgnore
    @AssertTrue
    public boolean isTotalValid() {
        return wood == null
                || fire == null
                || earth == null
                || metal == null
                || water == null
                || (long) wood + fire + earth + metal + water == 8;
    }
}
