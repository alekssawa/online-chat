import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserKeys } from '../../../hooks/useGenerateUserKeys'
// import { useUserKeysStore } from '../../../store/userKeys'
import styles from './LoginForm.module.css'

import { ToastContainer, toast } from 'react-toastify'

interface AuthFormProps {
	setIsAuthForm: (value: boolean) => void
}

function AuthForm({ setIsAuthForm }: AuthFormProps) {
	const { decryptPrivateKey } = useUserKeys()
	// const { privateKey } = useUserKeysStore()
	const navigate = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const [errors, setErrors] = useState<{ email?: string; password?: string }>(
		{}
	)
	// const [remember, setRemember] = useState(false);
	const [success, setSuccess] = useState(false)
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Простые валидаторы
	const validateEmail = (value: string) => {
		const re = /\S+@\S+\.\S+/
		return re.test(value) ? '' : 'Введите корректный email'
	}

	const validatePassword = (value: string) => {
		return value.length >= 6 ? '' : 'Пароль должен быть минимум 6 символов'
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		const emailError = validateEmail(email)
		const passwordError = validatePassword(password)

		if (emailError || passwordError) {
			setErrors({ email: emailError, password: passwordError })
			return
		}

		setIsSubmitting(true)
		setErrors({})

		try {
			const query = `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          accessToken
          user { 
            id 
            email 
            name 
            avatar {  
              url
            }
            nickname
            about
            birthDate
            lastOnline
            friends {
              id
              createdAt
              friend {
                  id
                  email
                  name
                  nickname
                  about
                  birthDate
                  lastOnline
                  avatar {
                      url
                  }
              }
            }
            privacy {
                showLastOnline
                showAbout
                showEmail
                allowCalls
            }
            publicKey
            encryptedPrivateKey
            salt
            iv
            kdfIterations
            keyCreatedAt
            keyUpdatedAt
          }
        }
      }
    `
			const variables = { email, password }

			const response = await fetch(
				`${import.meta.env.VITE_URL_BACKEND}/graphql`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({ query, variables }),
				}
			)

			const result = await response.json()
			if (result.errors) throw new Error('Login failed')

			const { accessToken, user } = result.data.login

			console.log(user)
			localStorage.setItem('accessToken', accessToken)
			await decryptPrivateKey(
				password,
				user.encryptedPrivateKey,
				user.salt,
				user.iv,
				user.kdfIterations
			)

			setSuccess(true)
			localStorage.setItem('user', JSON.stringify(user))
			console.log('User logged in:', user)
			navigate('/Chat')
		} catch (err) {
			console.error(err)
			setErrors({ email: 'Ошибка входа', password: 'Ошибка входа' })
		} finally {
			setIsSubmitting(false)
		}
	}

	useEffect(() => {
		if (success) toast.success('Вход успешен!')
	}, [success])

	return (
		<div className={styles.container}>
			<div className={styles.background}>
				<form className={styles.login_form} onSubmit={handleSubmit}>
					<div className={styles.login_header}>
						<h2>Login</h2>
					</div>

					<div className={styles.form_group}>
						<div
							className={`${styles.input_wrapper} ${styles.password_wrapper}`}
						>
							<input
								type='email'
								id='email'
								name='email'
								required
								autoComplete='email'
								value={email}
								onChange={e => setEmail(e.target.value)}
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
							className={`${styles.input_wrapper} ${styles.password_wrapper}`}
						>
							<input
								type={showPassword ? 'text' : 'password'}
								id='password'
								name='password'
								required
								autoComplete='off'
								value={password}
								onChange={e => setPassword(e.target.value)}
							/>
							<label>Password</label>
							<button
								type='button'
								className={styles.password_toggle}
								onClick={() => setShowPassword(prev => !prev)}
							>
								<span
									className={`${styles.eye_icon} ${
										showPassword ? styles.show_password : ''
									}`}
								></span>
							</button>
							{/* <span className={styles.focus_border}></span> */}
						</div>
						{errors.password && (
							<span className={styles.error_message}>{errors.password}</span>
						)}
					</div>

					{/* <div className={styles.form_options}>
            <label className={styles.remember_wrapper}>
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember((prev) => !prev)}
              />
              <span className={styles.checkbox_label}>
                <span className={styles.checkmark}></span>
                Remember me
              </span>
            </label>
            <a
              href="#"
              className={styles.forgot_password}
              onClick={(e) => e.preventDefault()}
            >
              Forgot password?
            </a>
          </div> */}

					<button
						type='submit'
						className={`${styles.login_btn} ${styles.btn}`}
						disabled={isSubmitting}
					>
						<span className={styles.btn_text}>Sign In</span>
						<span className={styles.btn_loader}></span>
					</button>

					<div className={styles.signUp_options}>
						<span>Don't have an account? </span>

						<a
							className={styles.signUp_link}
							onClick={() => setIsAuthForm(false)}
						>
							Sign up
						</a>
					</div>
				</form>
			</div>
			<ToastContainer
				position='bottom-center'
				pauseOnHover={false}
				pauseOnFocusLoss={false}
				hideProgressBar
				closeOnClick={false}
				draggable={false}
				limit={2}
				autoClose={1500}
				theme='dark'
			/>
		</div>
	)
}

export default AuthForm
