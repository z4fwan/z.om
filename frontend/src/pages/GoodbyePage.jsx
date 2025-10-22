const GoodbyePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-3xl font-bold mb-4 text-red-600">Account Deleted</h1>
      <p className="text-lg">
        Your account has been permanently deleted.
        <br />
        sorry to see you go.
      </p>
    </div>
  );
};

export default GoodbyePage;
