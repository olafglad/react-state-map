import React from 'react';

// Feature 4: Rename Tracking
// This demonstrates props being renamed through destructuring

interface DealInfo {
  id: number;
  name: string;
  value: number;
  status: string;
}

// Level 1: Receives as dealInfoForm, destructures and renames
export function DealContainer({ dealInfoForm }: { dealInfoForm: DealInfo }) {
  // Rename via destructuring: dealInfoForm.id -> dealId, dealInfoForm.name -> dealName
  const { id: dealId, name: dealName, value, status } = dealInfoForm;

  return (
    <div className="deal-container">
      <DealHeader formId={dealId} formName={dealName} />
      <DealDetails dealValue={value} dealStatus={status} />
    </div>
  );
}

// Level 2: Receives renamed props, renames again
function DealHeader({ formId, formName }: { formId: number; formName: string }) {
  // Another rename
  const id = formId;
  const title = formName;

  return (
    <DealTitle identifier={id} displayTitle={title} />
  );
}

// Level 3: Final display with different names
function DealTitle({ identifier, displayTitle }: { identifier: number; displayTitle: string }) {
  return <h2>#{identifier}: {displayTitle}</h2>;
}

function DealDetails({ dealValue, dealStatus }: { dealValue: number; dealStatus: string }) {
  return (
    <div>
      <span>Value: ${dealValue}</span>
      <span>Status: {dealStatus}</span>
    </div>
  );
}
