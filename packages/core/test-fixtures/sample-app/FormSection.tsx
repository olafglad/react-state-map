import React from 'react';

// Feature 2: Bundle Detection
// This demonstrates passing large object bundles as props

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
}

interface FormSectionProps {
  formData: FormData;
  onUpdate: (data: Partial<FormData>) => void;
}

export function FormSection({ formData, onUpdate }: FormSectionProps) {
  // This is a passthrough - just forwards the bundle to children
  return (
    <div className="form-section">
      <PersonalInfo
        userData={{
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address
        }}
      />
      <AddressFields formData={formData} onUpdate={onUpdate} />
    </div>
  );
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

function PersonalInfo({ userData }: { userData: UserData }) {
  return (
    <div>
      <span>{userData.firstName} {userData.lastName}</span>
      <span>{userData.email}</span>
    </div>
  );
}

function AddressFields({ formData, onUpdate }: FormSectionProps) {
  return (
    <div>
      <input value={formData.city} onChange={e => onUpdate({ city: e.target.value })} />
      <input value={formData.zipCode} onChange={e => onUpdate({ zipCode: e.target.value })} />
    </div>
  );
}
