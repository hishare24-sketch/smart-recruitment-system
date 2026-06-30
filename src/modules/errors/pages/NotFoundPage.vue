<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <VContainer class="fill-height" style="min-height: 100vh">
    <VRow justify="center" align="center">
      <VCol cols="12" class="text-center">
        <div class="text-h1 font-weight-bold text-primary mb-2" style="font-size: 96px">
          404
        </div>
        <h1 class="text-h5 font-weight-bold mb-2">الصفحة غير موجودة</h1>
        <p class="text-body-1 text-medium-emphasis mb-6">
          عذراً، الصفحة التي تبحث عنها غير متوفّرة.
        </p>
        <VBtn color="accent" size="large" prepend-icon="mdi-home" @click="router.push({ name: 'dashboard' })">
          العودة للرئيسية
        </VBtn>
      </VCol>
    </VRow>
  </VContainer>
</template>
