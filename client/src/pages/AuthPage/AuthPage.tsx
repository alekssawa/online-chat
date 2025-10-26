import LoginForm from "./loginForm/LoginForm";

import { useState } from "react";
import RegistrationForm from "./registerFrom/RegisterForm";

function General() {
  const [isAuthForm, setIsAuthForm] = useState(true);

  return (
    <>
      {isAuthForm ? (
        <LoginForm setIsAuthForm={setIsAuthForm} />
      ) : (
        <RegistrationForm setIsAuthForm={setIsAuthForm} />
      )}
    </>
  );
}

export default General;
