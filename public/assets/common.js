function showProfile(profile) {
    if (!profile) {
        return;
    }

    $('.profile-img').attr('src', profile.picture);
    $('.profile-name').text(profile.name);
    $('body').addClass('auth');
}
