import React from 'react'

export const Cancellationandnorefundpolicy = () => {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10 bg-white rounded-lg shadow-md mt-8 mb-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Cancellation and No Refund Policy</h1>
      <section className="mb-6">
        <p className="text-gray-700 mb-2">Thank you for choosing Rewiree. We value your trust and are committed to delivering a high-quality experience. Please read our cancellation and refund policy carefully before making a payment.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. No Cancellations</h2>
        <p className="text-gray-700">Once a subscription, consultation, or service has been purchased through Rewiree, it cannot be cancelled. Please ensure that you review all details and service descriptions before proceeding with payment.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. No Refunds</h2>
        <ul className="list-disc list-inside text-gray-700 mb-2">
          <li>Unused consultations or services</li>
          <li>User dissatisfaction</li>
          <li>Accidental purchases</li>
          <li>Change of mind</li>
        </ul>
        <p className="text-gray-700">All payments made on Rewiree are final and non-refundable. We do not offer refunds for any reason, including but not limited to the above.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Exceptions</h2>
        <p className="text-gray-700">Refunds will only be considered under exceptional circumstances, such as duplicate payments or proven technical issues resulting in non-delivery of services. Such requests must be made in writing within 3 days of the transaction, and eligibility will be determined at Rewiree's sole discretion.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Chargebacks and Disputes</h2>
        <p className="text-gray-700">Initiating chargebacks through your bank or card issuer without contacting us first may result in permanent suspension of your Rewiree account. We encourage you to reach out to our support team at <a href="mailto:info@rewiree.com" className="text-blue-600 underline">info@rewiree.com</a> if you face any issues.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Refund Policy</h2>
        <p className="text-gray-700">All refunds will be processed and credited to the original payment mode within 6 to 8 business days.</p>
      </section>
      <div className="mt-8 text-center">
        <p className="text-gray-700">By completing your purchase on Rewiree, you acknowledge that you have read, understood, and agreed to this policy.</p>
      </div>
    </div>
  )
}
