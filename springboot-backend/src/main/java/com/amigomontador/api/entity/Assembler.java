package com.amigomontador.api.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.List;
import java.util.Map;

@Entity
@Table(name = "assemblers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Assembler {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @NotBlank
    @Column(nullable = false)
    private String address;
    
    @Column(name = "address_number")
    private String addressNumber;
    
    private String neighborhood;
    
    private String cep;
    
    @NotBlank
    @Column(nullable = false)
    private String city;
    
    @NotBlank
    @Column(nullable = false)
    private String state;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "specialties", columnDefinition = "jsonb")
    private List<String> specialties;
    
    @Column(name = "technical_assistance")
    private Boolean technicalAssistance = false;
    
    private String experience;
    
    @Column(name = "work_radius")
    private Integer workRadius = 20;
    
    private Integer rating;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "documents", columnDefinition = "jsonb")
    private Map<String, Object> documents;
    
    @Column(name = "document_type")
    @Enumerated(EnumType.STRING)
    private DocumentType documentType;
    
    @Column(name = "document_number")
    private String documentNumber;
    
    @NotBlank
    @Column(name = "rg_front_url", nullable = false)
    private String rgFrontUrl;
    
    @NotBlank
    @Column(name = "rg_back_url", nullable = false)
    private String rgBackUrl;
    
    @NotBlank
    @Column(name = "proof_of_address_url", nullable = false)
    private String proofOfAddressUrl;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "certificates_urls", columnDefinition = "jsonb")
    private List<String> certificatesUrls;
    
    @Column(name = "experience_years")
    private Integer experienceYears = 0;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "service_types", columnDefinition = "jsonb")
    private List<String> serviceTypes;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "availability", columnDefinition = "jsonb")
    private Map<String, Object> availability;
    
    @Column(name = "has_own_tools")
    private Boolean hasOwnTools = true;
    
    @Column(name = "professional_description")
    private String professionalDescription;
    
    public enum DocumentType {
        cpf, cnpj
    }
}