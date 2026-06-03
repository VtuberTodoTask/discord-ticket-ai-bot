<template>
  <div>
    <nav class="navbar navbar-expand-lg">
      <div class="container-fluid">
        <NuxtLink class="navbar-brand" to="/">
          <i class="bi bi-ticket-perforated me-2"></i>Ticket Dashboard
        </NuxtLink>
        <button
          class="navbar-toggler border-secondary"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span class="navbar-toggler-icon"></span>
        </button>
        <div id="navbarNav" class="collapse navbar-collapse">
          <ul class="navbar-nav ms-auto">
            <li class="nav-item">
              <NuxtLink class="nav-link" to="/">
                <i class="bi bi-list-task me-1"></i>チケット一覧
              </NuxtLink>
            </li>
            <li class="nav-item">
              <NuxtLink class="nav-link" to="/moderation">
                <i class="bi bi-shield-exclamation me-1"></i>モデレーション
              </NuxtLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
    <div class="container-fluid py-4 px-lg-5">
      <slot />
    </div>
  </div>
</template>
