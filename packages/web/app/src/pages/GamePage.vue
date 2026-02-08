<template>
	<q-page class="game-page column items-center justify-center">
		<div class="game-card">
			<div class="game-title">Game in progress</div>
			<div class="game-subtitle">Loading your seat and roles…</div>
		</div>
	</q-page>
</template>

<script setup lang="ts"></script>

<style scoped>
.game-page {
	min-height: 100vh;
	padding: 32px;
}

.game-card {
	background: rgba(17, 21, 26, 0.78);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 20px;
	padding: 28px 32px;
	text-align: center;
	color: #f2f4f7;
	max-width: 360px;
	width: 100%;
	backdrop-filter: blur(12px);
}

.game-title {
	font-size: 20px;
	font-weight: 600;
	letter-spacing: 0.02em;
	margin-bottom: 8px;
}

.game-subtitle {
	font-size: 14px;
	opacity: 0.75;
}
</style>
