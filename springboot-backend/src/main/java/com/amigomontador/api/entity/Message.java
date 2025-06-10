package com.amigomontador.api.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "service_id", nullable = false)
    private Service service;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;
    
    @NotBlank
    @Column(nullable = false)
    private String content;
    
    @Column(name = "message_type")
    @Enumerated(EnumType.STRING)
    private MessageType messageType = MessageType.text;
    
    @Column(name = "sent_at")
    private LocalDateTime sentAt;
    
    @PrePersist
    protected void onCreate() {
        sentAt = LocalDateTime.now();
    }
    
    public enum MessageType {
        text, payment_proof, payment_confirmation
    }
}