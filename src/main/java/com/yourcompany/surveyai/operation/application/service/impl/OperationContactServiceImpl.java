package com.yourcompany.surveyai.operation.application.service.impl;

import com.yourcompany.surveyai.operation.application.dto.request.OperationContactInput;
import com.yourcompany.surveyai.operation.application.dto.request.UploadOperationContactsRequest;
import com.yourcompany.surveyai.operation.application.dto.response.OperationContactResponseDto;
import com.yourcompany.surveyai.operation.application.service.OperationContactService;
import com.yourcompany.surveyai.operation.domain.entity.Operation;
import com.yourcompany.surveyai.operation.domain.entity.OperationContact;
import com.yourcompany.surveyai.operation.domain.enums.OperationContactStatus;
import com.yourcompany.surveyai.operation.repository.OperationContactRepository;
import com.yourcompany.surveyai.operation.repository.OperationRepository;
import com.yourcompany.surveyai.common.exception.NotFoundException;
import com.yourcompany.surveyai.common.exception.ValidationException;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class OperationContactServiceImpl implements OperationContactService {

    private static final Pattern PHONE_NUMBER_PATTERN = Pattern.compile("^\\+?[1-9]\\d{7,14}$");

    private final OperationRepository operationRepository;
    private final OperationContactRepository operationContactRepository;
    private final Validator validator;

    public OperationContactServiceImpl(
            OperationRepository operationRepository,
            OperationContactRepository operationContactRepository,
            Validator validator
    ) {
        this.operationRepository = operationRepository;
        this.operationContactRepository = operationContactRepository;
        this.validator = validator;
    }

    @Override
    @Transactional
    public List<OperationContactResponseDto> uploadContacts(
            UUID companyId,
            UUID operationId,
            UploadOperationContactsRequest request
    ) {
        validateRequest(request);

        Operation operation = getOperation(companyId, operationId);
        ensureNoDuplicatePhoneNumbers(request.getContacts());

        List<OperationContact> contacts = request.getContacts().stream()
                .map(input -> buildContact(operation, input))
                .toList();

        return operationContactRepository.saveAll(contacts).stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    public List<OperationContactResponseDto> listContacts(UUID companyId, UUID operationId) {
        getOperation(companyId, operationId);

        return operationContactRepository
                .findAllByOperation_IdAndCompany_IdAndDeletedAtIsNullOrderByCreatedAtDesc(operationId, companyId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    private void validateRequest(UploadOperationContactsRequest request) {
        Set<ConstraintViolation<UploadOperationContactsRequest>> violations = validator.validate(request);
        if (!violations.isEmpty()) {
            throw new ValidationException(violations.iterator().next().getMessage());
        }
    }

    private Operation getOperation(UUID companyId, UUID operationId) {
        return operationRepository.findByIdAndCompany_IdAndDeletedAtIsNull(operationId, companyId)
                .orElseThrow(() -> new NotFoundException("Operation not found for company: " + operationId));
    }

    private void ensureNoDuplicatePhoneNumbers(List<OperationContactInput> contacts) {
        Set<String> seenPhoneNumbers = new HashSet<>();

        for (OperationContactInput input : contacts) {
            String normalizedPhoneNumber = normalizePhoneNumber(input.getPhoneNumber());
            if (!seenPhoneNumbers.add(normalizedPhoneNumber)) {
                throw new ValidationException("Duplicate phone number in upload payload: " + normalizedPhoneNumber);
            }
        }
    }

    private OperationContact buildContact(Operation operation, OperationContactInput input) {
        String normalizedPhoneNumber = normalizePhoneNumber(input.getPhoneNumber());
        validatePhoneNumber(normalizedPhoneNumber);

        OperationContact contact = new OperationContact();
        contact.setCompany(operation.getCompany());
        contact.setOperation(operation);
        contact.setFirstName(input.getName().trim());
        contact.setPhoneNumber(normalizedPhoneNumber);
        contact.setMetadataJson("{}");
        contact.setStatus(OperationContactStatus.PENDING);
        contact.setRetryCount(0);
        return contact;
    }

    private void validatePhoneNumber(String phoneNumber) {
        if (!PHONE_NUMBER_PATTERN.matcher(phoneNumber).matches()) {
            throw new ValidationException("Invalid phone number format. Use an international-style number like +905551112233");
        }
    }

    private String normalizePhoneNumber(String phoneNumber) {
        return phoneNumber.replaceAll("[\\s()\\-]", "");
    }

    private OperationContactResponseDto toDto(OperationContact contact) {
        return new OperationContactResponseDto(
                contact.getId(),
                contact.getCompany().getId(),
                contact.getOperation().getId(),
                contact.getFirstName(),
                contact.getPhoneNumber(),
                contact.getStatus(),
                contact.getCreatedAt(),
                contact.getUpdatedAt()
        );
    }
}
