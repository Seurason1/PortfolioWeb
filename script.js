(function () {
  const data = window.PORTFOLIO_DATA;
  const state = {
    activeProjectIndex: -1,
    activeImageIndex: 0,
    lastFocusedElement: null,
    masonryColumnCount: 0,
    projectCards: [],
    resizeFrame: 0
  };

  const selectors = {
    header: document.querySelector("[data-header]"),
    artistName: document.querySelector("[data-artist-name]"),
    footerName: document.querySelector("[data-footer-name]"),
    role: document.querySelector("[data-role]"),
    heroTitle: document.querySelector("[data-hero-title]"),
    heroRole: document.querySelector("[data-hero-role]"),
    heroCopy: document.querySelector("[data-hero-copy]"),
    aboutTitle: document.querySelector("[data-about-title]"),
    aboutCopy: document.querySelector("[data-about-copy]"),
    skillList: document.querySelector("[data-skill-list]"),
    contactLinks: document.querySelector("[data-contact-links]"),
    contactSection: document.querySelector("[data-contact-section]"),
    contactNav: document.querySelector("[data-contact-nav]"),
    projectGrid: document.querySelector("[data-project-grid]"),
    year: document.querySelector("[data-year]"),
    modal: document.querySelector("[data-modal]"),
    modalImage: document.querySelector("[data-modal-image]"),
    modalCategory: document.querySelector("[data-modal-category]"),
    modalTitle: document.querySelector("[data-modal-title]"),
    modalDescription: document.querySelector("[data-modal-description]"),
    modalCount: document.querySelector("[data-modal-count]"),
    modalYear: document.querySelector("[data-modal-year]"),
    thumbnailStrip: document.querySelector("[data-thumbnail-strip]")
  };

  function setText(element, text) {
    if (element && text) {
      element.textContent = text;
    }
  }

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function getProjectImageAlt(project, imageIndex) {
    return `${project.title} render ${imageIndex + 1} of ${project.images.length}`;
  }

  function renderArtist() {
    const artist = data.artist;

    setText(selectors.artistName, artist.name);
    setText(selectors.footerName, artist.name);
    setText(selectors.role, artist.role);
    setText(selectors.heroTitle, artist.name);
    setText(selectors.heroRole, artist.role);
    setText(selectors.heroCopy, artist.heroCopy);
    setText(selectors.aboutTitle, artist.aboutTitle);
    setText(selectors.aboutCopy, artist.aboutCopy);
    setText(selectors.year, String(new Date().getFullYear()));

    document.title = `${artist.name} | ${artist.role}`;

    selectors.skillList.innerHTML = "";
    artist.skills.forEach((skill) => {
      selectors.skillList.append(createElement("span", "skill-pill", skill));
    });
  }

  function getContactItems() {
    const contact = data.artist.contact;
    return [
      { label: "Email", href: contact.email ? `mailto:${contact.email}` : "" },
      { label: "ArtStation", href: contact.artstation },
      { label: "LinkedIn", href: contact.linkedin },
      { label: "GitHub", href: contact.github },
      { label: "Resume", href: contact.resume }
    ].filter((item) => item.href);
  }

  function renderContactLinks() {
    selectors.contactLinks.innerHTML = "";
    const contactItems = getContactItems();
    const hasContactItems = contactItems.length > 0;

    selectors.contactSection.hidden = !hasContactItems;
    selectors.contactNav.hidden = !hasContactItems;

    contactItems.forEach((item) => {
      const link = createElement("a", "button button-secondary", item.label);
      link.href = item.href;
      if (!item.href.startsWith("mailto:")) {
        link.target = "_blank";
        link.rel = "noreferrer";
      }
      selectors.contactLinks.append(link);
    });
  }

  function parseThumbnailRatio(value) {
    const [width, height] = String(value).split("/").map(Number);
    return width > 0 && height > 0 ? width / height : 1;
  }

  function createProjectCard(project, projectIndex) {
    const card = createElement("button", "project-card");
    card.type = "button";
    card.setAttribute("aria-label", `Open ${project.title} project gallery`);
    card.dataset.projectIndex = String(projectIndex);
    card.dataset.inverseRatio = String(1 / parseThumbnailRatio(project.thumbnailRatio));

    const cover = createElement("div", "project-cover");
    if (project.thumbnailRatio) {
      cover.style.aspectRatio = project.thumbnailRatio;
    }

    const image = document.createElement("img");
    image.src = project.cover;
    image.alt = `${project.title} cover render`;
    image.loading = "lazy";
    cover.append(image);

    const title = createElement("h3", "", project.title);
    title.className = "project-title-overlay";
    cover.append(title);
    card.append(cover);
    card.addEventListener("click", () => openProject(projectIndex, 0));
    return card;
  }

  function getProjectColumnCount() {
    const value = getComputedStyle(selectors.projectGrid).getPropertyValue("--project-columns");
    return Math.max(1, Math.min(data.projects.length, Number.parseInt(value, 10) || 1));
  }

  function distributeProjectCards(columnCount) {
    const columns = Array.from({ length: columnCount }, () => []);
    const unitHeights = Array(columnCount).fill(0);

    state.projectCards.forEach((card, index) => {
      let targetColumn = index;
      if (index >= columnCount) {
        targetColumn = unitHeights.indexOf(Math.min(...unitHeights));
      }

      columns[targetColumn].push(card);
      unitHeights[targetColumn] += Number(card.dataset.inverseRatio);
    });

    return columns;
  }

  function balanceProjectColumns(columns) {
    const gridStyle = getComputedStyle(selectors.projectGrid);
    const gap = Number.parseFloat(gridStyle.columnGap) || 0;
    const availableWidth = selectors.projectGrid.clientWidth - gap * (columns.length - 1);
    const unitHeights = columns.map((column) =>
      Array.from(column.children).reduce(
        (total, card) => total + Number(card.dataset.inverseRatio),
        0
      )
    );
    const targetHeight =
      (availableWidth +
        gap *
          columns.reduce(
            (total, column, index) =>
              total + (column.children.length - 1) / unitHeights[index],
            0
          )) /
      unitHeights.reduce((total, unitHeight) => total + 1 / unitHeight, 0);

    columns.forEach((column, index) => {
      const columnGaps = gap * (column.children.length - 1);
      column.style.width = `${(targetHeight - columnGaps) / unitHeights[index]}px`;
    });
  }

  function layoutProjectGrid() {
    const columnCount = getProjectColumnCount();

    if (state.masonryColumnCount !== columnCount) {
      selectors.projectGrid.innerHTML = "";
      const cardGroups = distributeProjectCards(columnCount);
      cardGroups.forEach((cards) => {
        const column = createElement("div", "project-column");
        cards.forEach((card) => column.append(card));
        selectors.projectGrid.append(column);
      });
      state.masonryColumnCount = columnCount;
    }

    balanceProjectColumns(Array.from(selectors.projectGrid.children));
  }

  function scheduleProjectGridLayout() {
    window.cancelAnimationFrame(state.resizeFrame);
    state.resizeFrame = window.requestAnimationFrame(layoutProjectGrid);
  }

  function renderProjects() {
    state.projectCards = data.projects.map(createProjectCard);
    state.masonryColumnCount = 0;
    layoutProjectGrid();
  }

  function openProject(projectIndex, imageIndex) {
    state.activeProjectIndex = projectIndex;
    state.activeImageIndex = imageIndex;
    state.lastFocusedElement = document.activeElement;

    renderModal();
    selectors.modal.classList.add("is-open");
    selectors.modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const closeButton = selectors.modal.querySelector("[data-modal-close]");
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeProject() {
    selectors.modal.classList.remove("is-open");
    selectors.modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (state.lastFocusedElement && typeof state.lastFocusedElement.focus === "function") {
      state.lastFocusedElement.focus();
    }
  }

  function moveImage(direction) {
    const project = data.projects[state.activeProjectIndex];
    if (!project) {
      return;
    }

    state.activeImageIndex =
      (state.activeImageIndex + direction + project.images.length) % project.images.length;
    renderModalImage();
    renderThumbnails();
  }

  function setImage(imageIndex) {
    state.activeImageIndex = imageIndex;
    renderModalImage();
    renderThumbnails();
  }

  function renderModal() {
    const project = data.projects[state.activeProjectIndex];
    if (!project) {
      return;
    }

    setText(selectors.modalCategory, project.category);
    setText(selectors.modalTitle, project.title);
    setText(selectors.modalDescription, project.description);
    setText(selectors.modalYear, project.year);
    renderModalImage();
    renderThumbnails();
  }

  function renderModalImage() {
    const project = data.projects[state.activeProjectIndex];
    const imagePath = project.images[state.activeImageIndex];

    resetModalImageZoom();
    selectors.modalImage.src = imagePath;
    selectors.modalImage.alt = getProjectImageAlt(project, state.activeImageIndex);
    selectors.modalCount.textContent = `${state.activeImageIndex + 1} / ${project.images.length}`;
  }

  function canZoomModalImage() {
    const image = selectors.modalImage;
    const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    return (
      hasFinePointer &&
      image.complete &&
      (image.naturalWidth > image.clientWidth || image.naturalHeight > image.clientHeight)
    );
  }

  function updateModalImageZoomPosition(event) {
    if (!canZoomModalImage()) {
      return;
    }

    const rect = selectors.modalImage.getBoundingClientRect();
    const x = Math.min(Math.max(((event.clientX - rect.left) / rect.width) * 100, 0), 100);
    const y = Math.min(Math.max(((event.clientY - rect.top) / rect.height) * 100, 0), 100);

    selectors.modalImage.style.objectPosition = `${x}% ${y}%`;
  }

  function handleModalImageZoomStart(event) {
    if (!canZoomModalImage()) {
      return;
    }

    selectors.modalImage.classList.add("is-zoomed");
    updateModalImageZoomPosition(event);
  }

  function handleModalImageZoomMove(event) {
    if (!selectors.modalImage.classList.contains("is-zoomed")) {
      handleModalImageZoomStart(event);
      return;
    }

    updateModalImageZoomPosition(event);
  }

  function resetModalImageZoom() {
    selectors.modalImage.classList.remove("is-zoomed");
    selectors.modalImage.style.objectPosition = "";
  }

  function renderThumbnails() {
    const project = data.projects[state.activeProjectIndex];
    selectors.thumbnailStrip.innerHTML = "";

    project.images.forEach((imagePath, imageIndex) => {
      const button = createElement("button", "thumbnail-button");
      button.type = "button";
      button.setAttribute("aria-label", `Show image ${imageIndex + 1}`);
      if (imageIndex === state.activeImageIndex) {
        button.classList.add("is-active");
        button.setAttribute("aria-current", "true");
      }

      const image = document.createElement("img");
      image.src = imagePath;
      image.alt = "";
      image.loading = "lazy";
      button.append(image);
      button.addEventListener("click", () => setImage(imageIndex));
      selectors.thumbnailStrip.append(button);
    });
  }

  function handleKeyboard(event) {
    const isModalOpen = selectors.modal.classList.contains("is-open");

    if (!isModalOpen) {
      return;
    }

    if (event.key === "Escape") {
      closeProject();
    }

    if (event.key === "ArrowLeft") {
      moveImage(-1);
    }

    if (event.key === "ArrowRight") {
      moveImage(1);
    }
  }

  function handleHeaderState() {
    selectors.header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  function bindEvents() {
    selectors.modal.querySelectorAll("[data-modal-close]").forEach((button) => {
      button.addEventListener("click", closeProject);
    });

    const previousButton = selectors.modal.querySelector("[data-prev]");
    const nextButton = selectors.modal.querySelector("[data-next]");
    previousButton.addEventListener("click", () => moveImage(-1));
    nextButton.addEventListener("click", () => moveImage(1));
    selectors.modalImage.addEventListener("pointerenter", handleModalImageZoomStart);
    selectors.modalImage.addEventListener("pointermove", handleModalImageZoomMove);
    selectors.modalImage.addEventListener("pointerleave", resetModalImageZoom);
    selectors.modalImage.addEventListener("mouseenter", handleModalImageZoomStart);
    selectors.modalImage.addEventListener("mousemove", handleModalImageZoomMove);
    selectors.modalImage.addEventListener("mouseleave", resetModalImageZoom);
    selectors.modalImage.addEventListener("load", resetModalImageZoom);

    window.addEventListener("keydown", handleKeyboard);
    window.addEventListener("scroll", handleHeaderState, { passive: true });
    window.addEventListener("resize", scheduleProjectGridLayout, { passive: true });
  }

  function init() {
    if (!data || !Array.isArray(data.projects)) {
      return;
    }

    renderArtist();
    renderContactLinks();
    renderProjects();
    bindEvents();
    handleHeaderState();
  }

  init();
})();
