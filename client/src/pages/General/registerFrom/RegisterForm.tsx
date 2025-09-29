import { useState, useEffect } from "react";
import styles from "./RegisterForm.module.css";
import { useNavigate } from "react-router-dom";

import { ToastContainer, toast } from "react-toastify";

interface RegisterFormProps {
  setIsAuthForm: (value: boolean) => void;
}

function RegisterForm({ setIsAuthForm }: RegisterFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );
  // const [remember, setRemember] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Простые валидаторы
  const validateEmail = (value: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(value) ? "" : "Введите корректный email";
  };

  const validatePassword = (value: string) => {
    return value.length >= 6 ? "" : "Пароль должен быть минимум 6 символов";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError =
      password === confirmPassword ? "" : "Пароли не совпадают";

    if (emailError || passwordError || confirmPasswordError) {
      setErrors({
        email: emailError,
        password: passwordError || confirmPasswordError,
      });
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const query = `
      mutation Register($name: String!, $email: String!, $password: String!) {
        register(name: $name, email: $email, password: $password) {
          accessToken
          user { id email name }
        }
      }
    `;
      const variables = { name, email, password };

      const response = await fetch("http://localhost:3000/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query, variables }),
      });

      const result = await response.json();
      if (result.errors) throw new Error("Register failed");

      const { accessToken, user } = result.data.register;
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(user));

      setSuccess(true);
      console.log("User registered:", user);
      navigate("/Chat");
    } catch (err) {
      console.error(err);
      setErrors({ email: "Ошибка регистрации", password: "Ошибка регистрации" });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (success) toast.success("Вход успешен!");
  }, [success]);

  return (
    <div className={styles.container}>
      <div className={styles.background}>
        <form className={styles.login_form} onSubmit={handleSubmit}>
          <div className={styles.login_header}>
            <h2>Register</h2>
          </div>

          <div className={styles.form_group}>
            <div
              className={`${styles.input_wrapper} ${styles.password_wrapper}`}
            >
              <input
                type="name"
                id="name"
                name="name"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <label>Name</label>
            </div>
          </div>

          <div className={styles.form_group}>
            <div
              className={`${styles.input_wrapper} ${styles.password_wrapper}`}
            >
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label>Email Address</label>
              <span className={styles.focus_border}></span>
            </div>
            {errors.email && (
              <span className={styles.error_message}>{errors.email}</span>
            )}
          </div>

          <div className={styles.form_group}>
            <div
              className={`${styles.input_wrapper} ${styles.password_wrapper} ${styles.first_password_input}`}
            >
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                required
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label>Password</label>
              <button
                type="button"
                className={styles.password_toggle}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <span
                  className={`${styles.eye_icon} ${
                    showPassword ? styles.show_password : ""
                  }`}
                ></span>
              </button>
              {/* <span className={styles.focus_border}></span> */}
            </div>

            <div
              className={`${styles.input_wrapper} ${styles.password_wrapper}`}
            >
              <input
                type={showPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                required
                autoComplete="off"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <label>Confirm password</label>
              <button
                type="button"
                className={styles.password_toggle}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                <span
                  className={`${styles.eye_icon} ${
                    showPassword ? styles.show_password : ""
                  }`}
                ></span>
              </button>
              {/* <span className={styles.focus_border}></span> */}
            </div>
            {errors.password && (
              <span className={styles.error_message}>{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            className={`${styles.login_btn} ${styles.btn}`}
            disabled={isSubmitting}
          >
            <span className={styles.btn_text}>Sign In</span>
            <span className={styles.btn_loader}></span>
          </button>

          <div className={styles.logIn_options}>
            <span>Already have an account? </span>

            <a
              className={styles.logIn_link}
              onClick={() => setIsAuthForm(true)}
            >
              Log in
            </a>
          </div>
        </form>
      </div>
      <ToastContainer
        position="bottom-center"
        pauseOnHover={false}
        limit={2}
        autoClose={1500}
      />
    </div>
  );
}

export default RegisterForm;
