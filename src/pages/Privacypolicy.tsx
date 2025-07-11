import React, { useEffect } from 'react'

export const Privacypolicy = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 bg-white rounded-lg shadow-md mt-8 mb-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-700">Privacy Policy</h1>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Information We Collect</h2>
        <p className="text-gray-700">We collect personal information such as your name, email address, phone number, and professional background when you register or use our platform.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. How We Use Your Information</h2>
        <p className="text-gray-700">Your information is used to provide and improve our services, personalize your experience, communicate with you, process transactions, and comply with legal obligations.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Data Protection</h2>
        <p className="text-gray-700">We implement appropriate technical and organizational measures to protect your personal data from unauthorized access, alteration, disclosure, or destruction.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Sharing Your Data</h2>
        <p className="text-gray-700">We do not sell or rent your personal information. We may share it with trusted third-party service providers for payment processing, analytics, or customer support—only to the extent necessary to perform these services.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
        <p className="text-gray-700">You have the right to access, correct, or delete your personal data. You may also object to certain data processing activities. To exercise these rights, please contact us at <a href="mailto:info@rewiree.com" className="text-blue-600 underline">info@rewiree.com</a>.</p>
      </section>
      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Changes to This Policy</h2>
        <p className="text-gray-700">We may update this Privacy Policy from time to time. Changes will be posted on this page with a revised date. Please review it periodically.
        </p>
        <p className='text-gray-700'>This policy is effective dated 21/07/2025.</p>
      </section>
      <div className="mt-8 text-center">
        <p className="text-gray-700">If you have any questions or concerns regarding this Privacy Policy, please contact us at <a href="mailto:info@rewiree.com" className="text-blue-600 underline">info@rewiree.com</a>.</p>
      </div>
    </div>
  )
}
