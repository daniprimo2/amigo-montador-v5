package com.amigomontador.api.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "services")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Service {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;
    
    @NotBlank
    @Column(nullable = false)
    private String title;
    
    @NotBlank
    @Column(nullable = false)
    private String description;
    
    @NotBlank
    @Column(nullable = false)
    private String location;
    
    private String address;
    
    @Column(name = "address_number")
    private String addressNumber;
    
    private String cep;
    
    @NotBlank
    @Column(nullable = false)
    private String latitude;
    
    @NotBlank
    @Column(nullable = false)
    private String longitude;
    
    @Column(name = "start_date", nullable = false)
    private LocalDateTime startDate;
    
    @Column(name = "end_date", nullable = false)
    private LocalDateTime endDate;
    
    @NotBlank
    @Column(nullable = false)
    private String price;
    
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ServiceStatus status = ServiceStatus.open;
    
    @NotBlank
    @Column(name = "material_type", nullable = false)
    private String materialType;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "project_files", nullable = false, columnDefinition = "jsonb")
    private List<Map<String, String>> projectFiles;
    
    @Column(name = "payment_reference")
    private String paymentReference;
    
    @Column(name = "payment_status")
    @Enumerated(EnumType.STRING)
    private PaymentStatus paymentStatus = PaymentStatus.pending;
    
    @Column(name = "payment_proof")
    private String paymentProof;
    
    @Column(name = "rating_required")
    private Boolean ratingRequired = false;
    
    @Column(name = "store_rating_completed")
    private Boolean storeRatingCompleted = false;
    
    @Column(name = "assembler_rating_completed")
    private Boolean assemblerRatingCompleted = false;
    
    @Column(name = "both_ratings_completed")
    private Boolean bothRatingsCompleted = false;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "completed_at")
    private LocalDateTime completedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum ServiceStatus {
        open, in_progress, completed, cancelled
    }
    
    public enum PaymentStatus {
        pending, proof_submitted, confirmed, rejected
    }
}