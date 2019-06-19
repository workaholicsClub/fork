let config = {
    apiKey: "AIzaSyA6oTItY_aVnmzm-kOm6c7TD34xhbVtKtk",
    authDomain: "forkation-8e8cf.firebaseapp.com",
    databaseURL: "https://forkation-8e8cf.firebaseio.com",
    projectId: "forkation-8e8cf",
    storageBucket: "forkation-8e8cf.appspot.com",
    messagingSenderId: "60951095104",
    appId: "1:60951095104:web:02d9800e6efffb12"
};

function getProjectHTML(project) {
  let hasLinkNames = typeof(project['linkNames']) !== 'undefined' && project.linkNames.length > 0;
  let hasLinks = typeof(project['links']) !== 'undefined' && project.links.length > 0;

  let linksHTML = project.links.map((link, index) => {
    let linkName = hasLinkNames && project.linkNames[index] ? project.linkNames[index] : link;
    return `<p class="card-text mb-0"><a href="${link}" target="_blank">${linkName}</a>`;
  }).join('\n');
  let tagsHTML = project.tags.map((tag) => {
    return `<span class="badge badge-primary">${tag}</span>`;
  }).join('\n');
  let doTagsHTML = project.doTags.map((doTag) => {
    return `<span class="badge badge-success">${doTag}</span>`;
  }).join('\n');
  let rolesHTML = project.roles.map((role) => {
    return `<span class="badge badge-warning">${role}</span>`;
  }).join('\n');
  let statusHTML = project.status ? project.status.map((status) => `<span class="">${status}</span>`).join("&nbsp;&bull;&nbsp;") : '';

  let feedbackHTML = project.feedback
    ? `<div class="d-flex flex-column">
           <span class="feedback-images">
                ${project.feedback.map(feedback => `<img class="feedback-img feedback-${feedback.type}" src="${feedback.userPicture}">`).join("\n")}
           </span>
           <span class="feedback-count text-muted">
            Участников: ${project.feedback.length}
           </span>
       </div>`
      : `<span class="text-muted">Участников: 0</span>`;

  return `<div class="card mb-4" data-project="${project.id}">
        <div class="card-header">
          <h5 class="card-title mb-0">${project.title}</h5>
        </div>
        <div class="card-body">
          <p class="card-text">${project.description}</p>
          ${hasLinks
            ? '<p class="card-text mb-0"><label>Ссылки</label></p>' + linksHTML
            : ''}
          <p class="card-tags mt-4">
            <label class="d-block">Возможности</label>
            ${doTagsHTML}
          </p>
          <p class="card-tags mt-4">
            <label class="d-block">Тематика</label>
            ${tagsHTML}
          </p>
          <p class="card-tags mt-4">
            <label class="d-block">Необходимые роли</label>
            ${rolesHTML}
          </p>
        </div>
        <div class="card-footer d-flex flex-column text-center">
            <div class="mb-4 text-muted">
                ${statusHTML}
            </div>
            <div class="d-flex justify-content-between align-items-end">
              <a href="#" class="btn btn-outline-primary btn-help" data-project="${project.id}">Могу помочь</a>
              ${feedbackHTML}
              <a href="#" class="btn btn-outline-success btn-try" data-project="${project.id}">Интересно попробовать</a>
            </div>
        </div>
      </div>`;
}
function loadRefsForDoc(doc, field) {
  let promises = [];
  if (!doc[field]) {
    return Promise.resolve(doc);
  }

  doc[field].forEach((ref) => {
    let promise = ref.get().then((refSnap) => refSnap.data());
    promises.push(promise);
  });

  return Promise.all(promises)
      .then(values => {
        doc[field] = values;
        return doc;
      });
}
function loadRefsForAllDocs(docs, field) {
  let promises = docs.map(doc => loadRefsForDoc(doc, field));
  return Promise.all(promises);
}
function querySnapshotToArray(querySnapshot) {
  let docs = [];

  querySnapshot.forEach((doc) => {
    docData = doc.data();
    docData.id = doc.id;
    docs.push(docData);
  });

  return docs;
}
function getUserId() {
  let user = getSavedProfileData();
  return user ? user.sub : false;
}
function addFeedbackReference(projectId, feedbackPath, db) {
  let feedbackDoc = db.doc(feedbackPath);
  return db.collection('projects').doc(projectId)
      .update({feedback: firebase.firestore.FieldValue.arrayUnion(feedbackDoc)})
      .then(() => db.collection('projects').doc(projectId).get());
}
function redrawProjectCard(projectId, db) {
  let $oldCard = $('.card[data-project="'+projectId+'"]');

  getProjectById(projectId, db)
      .then(project => {
        let newHTML = getProjectHTML(project);
        $oldCard.replaceWith(newHTML);
      });
}
function saveFeedbackAndRedrawProjectCard(db) {
  let $modal = $('#rolesModal');
  let profile = getSavedProfileData();
  let projectId = $modal.data('project');

  let feedbackData = {
    type: $modal.data('type'),
    projectId: projectId,
    roles: $modal.find('.btn-role.active').map((index, role) => $(role).text()).toArray(),
    userId: getUserId(),
    userPicture: profile ? profile.picture : false
  };

  let $button = $modal.find('.btn-save-feedback');
  $button.data('text', $button.text());

  $button
      .text('Сохранение...').attr('disabled', true);

  db.collection("feedback").add(feedbackData)
      .then(function(docRef) {
        console.log(docRef);
        return addFeedbackReference(projectId, docRef.path, db);
      })
      .then(function (docRef) {
        console.log(docRef.data());
        $modal.modal('hide');
        showMessage(feedbackData.type === 'help' ? 'Спасибо за отзывчивость!' : 'Спасибо за интерес!', 'success');
        redrawProjectCard(projectId, db);
      })
      .catch(function(error) {
        console.warn(error);
        $button.text('Ошибка! Сохраненить повторно').attr('disabled', false);
      });
}
function getAllProjects(db) {
  return db.collection("projects").get().then(querySnapshotToArray).then(docs => loadRefsForAllDocs(docs, 'feedback'));
}
function unique(data) {
  return data.filter((item, pos, arr) => arr.indexOf(item) === pos);
}
function intersect(data1, data2) {
  return data1.filter(value => data2.includes(value));
}
function collectTagsFromProjects(projects) {
  return unique( projects.reduce((acc, project) => acc.concat(project.tags), []) );
}
function collectRolesFromProjects(projects) {
  return unique( projects.reduce((acc, project) => acc.concat(project.roles), []) );
}
function drawTagsAndRoles(db) {
  $('.tag-list, .roles-list').html('');
  getAllProjects(db).then( (projects) => {
    let tags = collectTagsFromProjects(projects);
    let roles = collectRolesFromProjects(projects);

    let tagsHTML = tags.map((tag) => `<span class="btn btn-outline-primary btn-tag mb-2 mr-2">${tag}</span>`).join("\n");
    let rolesHTML = roles.map((role) => `<span class="btn btn-outline-warning btn-tag mb-2 mr-2">${role}</span>`).join("\n");

    $('.tag-list').html(tagsHTML);
    $('.roles-list').html(rolesHTML);
  });
}
function getFilterFromDOM() {
  return {
    roles: $('.roles-list .btn-tag.active').map((index, tag) => $(tag).text()).toArray(),
    tags: $('.tag-list .btn-tag.active').map((index, tag) => $(tag).text()).toArray(),
    doTags: $('.filter .btn-tag.active').map((index, tag) => $(tag).text()).toArray()
  };
}
function filterProjects(projects) {
  let filter = getFilterFromDOM();
  if (filter.tags.length === 0 && filter.roles.length === 0 && filter.doTags.length === 0) {
    return projects;
  }
  
  return projects
          .filter( (project) => {
            return (filter.tags.length === 0 || intersect(project.tags, filter.tags).length > 0) &&
                (filter.roles.length === 0 || intersect(project.roles, filter.roles).length > 0) &&
                (filter.doTags.length === 0 || intersect(project.doTags, filter.doTags).length > 0);
          });
}
function drawProjects(db) {
  $('.projects-list').html('Загрузка ...');
  
  getAllProjects(db).then(filterProjects).then( (projects) => {
    let projectsHTML = projects.map(getProjectHTML).join('\n');
    $('.projects-list').html(projectsHTML);
  });
}
function getProjectById(id, db) {
  return db.collection('projects').doc(id).get().then((refSnap) => {
    let docData = refSnap.data();
    docData.id = refSnap.id;
    return docData;
  }).then(doc => loadRefsForDoc(doc, 'feedback'));
}
function showCanHelpForm(project) {
  if (!isUserReady()) {
    return showAuthorizeForm();
  }

  let rolesHTML = project.roles.map((role) => `<span class="btn btn-outline-primary btn-role mb-2 mr-2">${role}</span>`).join("\n");

  let formModalHTML = `<div class="modal" tabindex="-1" role="dialog" id="rolesModal" data-type="help" data-project="${project.id}">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${project.title}</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <p>Укажи роли, с которыми ты можешь помочь</p>
        <p>${rolesHTML}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрыть</button>
        <button type="button" class="btn btn-primary btn-save-feedback">Помочь</button>
      </div>
    </div>
  </div>
</div>`;

  $('body').append(formModalHTML);
  $('#rolesModal').on('hidden.bs.modal', function (e) {
    $('#rolesModal').remove();
  }).modal('show');
}
function showTryForm(project) {
  if (!isUserReady()) {
    return showAuthorizeForm();
  }

  let rolesHTML = project.roles.map((role) => `<span class="btn btn-outline-success btn-role mb-2 mr-2">${role}</span>`).join("\n");

  let formModalHTML = `<div class="modal" tabindex="-1" role="dialog" id="rolesModal" data-type="try" data-project="${project.id}">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">${project.title}</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <p>Укажи роли, в которых тебе интересно себя попробовать</p>
        <p>${rolesHTML}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Закрыть</button>
        <button type="button" class="btn btn-success btn-save-feedback">Попробовать</button>
      </div>
    </div>
  </div>
</div>`;

  $('body').append(formModalHTML);
  $('#rolesModal').on('hidden.bs.modal', function (e) {
    $('#rolesModal').remove();
  }).modal('show');
}
function showAuthorizeForm() {
  let formModalHTML = `<div class="modal" tabindex="-1" role="dialog" id="authModal">
  <div class="modal-dialog" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Авторизация</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <p>Чтобы поучаствовать в проекте</p>
        <p><button type="button" class="btn btn-primary btn-block auth-trigger">Авторизуйтесь, пожалуйста</button></p>
      </div>
    </div>
  </div>
</div>`;

  $('body').append(formModalHTML);
  $('#authModal').on('hidden.bs.modal', function (e) {
    $('#authModal').remove();
  }).modal('show');
}
function showMessage(message, type) {
  let messageHTML = `<div class="message">
                          <div style="padding: 5px;">
                              <div id="inner-message" class="alert alert-${type}">
                                  <button type="button" class="close" data-dismiss="alert">&times;</button>
                                  ${message}
                              </div>
                          </div>
                      </div>`;
  $('body').append(messageHTML);
}

firebase.initializeApp(config);
let db = firebase.firestore();

drawProjects(db);
drawTagsAndRoles(db);

initAuth();
checkSession()
    .then(showProfile);

$(document).on('click', '.btn-tag', function () {
  let $clickedTag = $(this);
  $clickedTag.toggleClass('active');
  drawProjects(db);
});

$(document).on('click', '.btn-role', function () {
  let $clickedRole = $(this);
  $clickedRole.toggleClass('active');
});

$(document).on('click', '.btn-help', function (event) {
  event.preventDefault();
  let projectId = $(this).data('project');
  getProjectById(projectId, db)
      .then(showCanHelpForm);
});

$(document).on('click', '.btn-try', function (event) {
  event.preventDefault();
  let projectId = $(this).data('project');
  getProjectById(projectId, db)
      .then(showTryForm);
});

$(document).on('click', '.btn-save-feedback', () => saveFeedbackAndRedrawProjectCard(db));