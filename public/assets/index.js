let config = {
  apiKey: "AIzaSyA6oTItY_aVnmzm-kOm6c7TD34xhbVtKtk",
  authDomain: "forkation-8e8cf.firebaseapp.com",
  databaseURL: "https://forkation-8e8cf.firebaseio.com",
  projectId: "forkation-8e8cf",
  storageBucket: "forkation-8e8cf.appspot.com",
  messagingSenderId: "60951095104",
  appId: "1:60951095104:web:02d9800e6efffb12"
};

function getArrayFromField(fieldId) {
  let $field = $(fieldId);
  const separator = ';';
  
  let data = $field.val().split(separator).map( (value) => $.trim(value) );
  return data.filter((value) => value !== "");
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function capitalizeArray(data) {
  return data.map(capitalize);
}
function getProjectDataFromDOM() {
  let data =  {
    title: $('#title').val(),
    description: $('#description').val(),
    tags: capitalizeArray(getArrayFromField('#tags')),
    links: getArrayFromField('#links')
  }
  
  let linkNames = getArrayFromField('#linkNames');
  if (linkNames.length > 0) {
    data['linkNames'] = linkNames;
  }

  return data;
}
function saveProject(db, projectData) {
  if (projectData.title === "") {
    return false;
  }
  
  $('#add button')
    .removeClass('btn-danger btn-success')
    .addClass('btn-primary')
    .text('Сохранение...').attr('disabled', true);
  
  db.collection("projects").add(projectData)
    .then(function(docRef) {
      $('#add button')
        .removeClass('btn-primary')
        .addClass('btn-success')
        .text('Сохраненить еще').attr('disabled', false);

    })
    .catch(function(error) {
      $('#add button')
        .removeClass('btn-primary')
        .addClass('btn-danger')
        .text('Повторить сохранение').attr('disabled', false);
    });
}

firebase.initializeApp(config);
let db = firebase.firestore();

initAuth();
checkSession()
    .then(showProfile);

$(document).on('click', '#add button', function () {
  let project = getProjectDataFromDOM();
  saveProject(db, project);
});

$(document).on('click', 'a[href^="#"]', function (event) {
  event.preventDefault();
  let toSectionId = $(this).attr('href');
  $('section').hide();
  $(toSectionId).show();
});