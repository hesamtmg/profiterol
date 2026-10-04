<script setup lang="ts">
import EditableText from '../site/EditableText.vue';
defineProps<{
  p: { title: string; text: string; email: string; phone: string; address: string; copyright: string };
}>();
</script>

<template>
  <section class="px-3 py-3 @3xl:px-6">
    <div class="rounded-[2rem] bg-dark px-6 py-12 text-white @3xl:rounded-card @3xl:px-20 @3xl:py-16">
      <div class="grid gap-10 @3xl:grid-cols-2">
        <div>
          <h2 class="text-3xl font-black @3xl:text-5xl"><EditableText :value="p.title" path="title" /></h2>
          <p class="mt-4 max-w-md font-extralight opacity-80 @3xl:text-lg"><EditableText :value="p.text" path="text" multiline /></p>
        </div>
        <ul class="space-y-4 text-base @3xl:text-lg">
          <li v-if="p.email">
            <a :href="`mailto:${p.email}`" class="flex items-center gap-3 hover:text-secondary">
              <i class="mdi mdi-email-outline text-2xl text-secondary" /> <EditableText :value="p.email" path="email" />
            </a>
          </li>
          <li v-if="p.phone">
            <a :href="`tel:${p.phone.replace(/[^\d+]/g, '')}`" class="flex items-center gap-3 hover:text-secondary">
              <i class="mdi mdi-phone-outline text-2xl text-secondary" /> <span dir="ltr"><EditableText :value="p.phone" path="phone" /></span>
            </a>
          </li>
          <li v-if="p.address" class="flex items-start gap-3">
            <i class="mdi mdi-map-marker-outline text-2xl text-secondary" />
            <span class="whitespace-pre-line font-extralight"><EditableText :value="p.address" path="address" multiline /></span>
          </li>
        </ul>
      </div>
      <div class="mt-12 border-t border-white/15 pt-6 text-xs font-extralight opacity-60"><EditableText :value="p.copyright" path="copyright" /></div>
    </div>
  </section>
</template>
