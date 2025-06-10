package com.amigomontador.api.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ratings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Rating {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;
    
    @NotNull
    @Column(name = "from_user_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private User.UserType fromUserType;
    
    @NotNull
    @Column(name = "to_user_type", nullable = false)
    @Enumerated(EnumType.STRING)
    private User.UserType toUserType;
    
    @Min(1) @Max(5)
    @Column(nullable = false)
    private Integer rating;
    
    private String comment;
    
    @Column(name = "emoji_rating")
    private String emojiRating;
    
    @Min(1) @Max(5)
    @Column(name = "punctuality_rating")
    private Integer punctualityRating = 5;
    
    @Min(1) @Max(5)
    @Column(name = "quality_rating")
    private Integer qualityRating = 5;
    
    @Min(1) @Max(5)
    @Column(name = "compliance_rating")
    private Integer complianceRating = 5;
    
    @Column(name = "service_region", length = 255)
    private String serviceRegion;
    
    @Column(name = "is_latest")
    private Boolean isLatest = false;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}