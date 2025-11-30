import React, { useState } from 'react'

import styles from './PrivacyAndSecurity.module.css'

import type { PrivacyLevel, PrivacySettings, User } from '../../../../type'

interface PrivacyProps {
	privacy?: PrivacySettings
	onChange?: (updated: PrivacySettings) => void
	onBack?: () => void
}

export const PrivacyAndSecurity: React.FC<PrivacyProps> = ({
	privacy,
	onChange,
}) => {
	const user: User | null = JSON.parse(localStorage.getItem('user') || 'null')

	const initialSettings = privacy ?? user?.privacy ?? undefined
	const [settings, setSettings] = useState<PrivacySettings | undefined>(
		initialSettings
	)

	if (!settings) return <p>No privacy settings found</p>

	const keys = Object.keys(settings).filter(
		key => key !== 'id' && key !== '__typename'
	)

	const handleChange = (key: keyof PrivacySettings, value: PrivacyLevel) => {
		const updated = { ...settings, [key]: value }
		setSettings(updated)
	}

	const handleApply = () => {
		onChange?.(settings)
		alert('Настройки применены!')
	}

	return (
		<div className={styles.container}>
			<h3 className={styles.title}>Privacy</h3>
			{keys.map(key => (
				<div key={key} className={styles.row}>
					<label className={styles.label}>{key}:</label>
					<select
						value={settings[key as keyof PrivacySettings]}
						onChange={e =>
							handleChange(
								key as keyof PrivacySettings,
								e.target.value as PrivacyLevel
							)
						}
						className={styles.select}
					>
						<option value='ALL'>All</option>
						<option value='FRIENDS'>Friends</option>
						<option value='NONE'>None</option>
					</select>
				</div>
			))}

			<button className={styles.applyButton} onClick={handleApply}>
				Apply
			</button>
		</div>
	)
}
