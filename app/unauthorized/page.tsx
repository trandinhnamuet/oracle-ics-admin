"use client";


import React from "react";
import { useTranslation } from "react-i18next";

export default function UnauthorizedPage() {
	const { t } = useTranslation();
	return (
		<div
			style={{
				minHeight: "auto",
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				background: "linear-gradient(135deg, #fff 60%, #ffeaea 100%)",
				borderRadius: 16,
				boxShadow: "0 4px 24px 0 rgba(211,47,47,0.08)",
				padding: 32,
				marginTop: 150,
				marginBottom: 150,
				border: "2.5px solid #d32f2f",
				maxWidth: 480,
				marginLeft: "auto",
				marginRight: "auto"
			}}
		>
			<div style={{
				background: "#fff0f0",
				borderRadius: "50%",
				width: 80,
				height: 80,
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				marginBottom: 24,
				boxShadow: "0 2px 8px 0 rgba(211,47,47,0.10)"
			}}>
				<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
					<circle cx="24" cy="24" r="24" fill="#fff0f0"/>
					<path d="M24 14V28" stroke="#d32f2f" strokeWidth="3" strokeLinecap="round"/>
					<circle cx="24" cy="34" r="2.5" fill="#d32f2f"/>
				</svg>
			</div>
			<h1 style={{ color: "#d32f2f", fontSize: 28, fontWeight: 700, marginBottom: 12, textAlign: "center" }}>
				{t('unauthorized.title')}
			</h1>
			<p style={{ color: "#555", fontSize: 18, marginBottom: 0, textAlign: "center", maxWidth: 400 }}>
				{t('unauthorized.description')}
			</p>
		</div>
	);
}
