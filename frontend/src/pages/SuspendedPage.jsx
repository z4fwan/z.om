// frontend/src/pages/SuspendedPage.jsx


const SuspendedPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-red-100 text-red-800">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Account Suspended</h1>
        <p className="text-lg">Your account has been temporarily suspended.</p>
        <p>Please contact support for more information.</p>
      </div>
    </div>
  );
};

export default SuspendedPage;
