package com.amigomontador.api.dto;

import com.amigomontador.api.entity.User;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserDTO {
    private Long id;
    private String username;
    private String name;
    private String email;
    private String phone;
    private User.UserType userType;
    private String profilePhotoUrl;
    private Map<String, Object> profileData;
    private LocalDateTime createdAt;
}