// RHEA Avatar Enhancement
document.addEventListener('DOMContentLoaded', () => {
    const avatarInner = document.querySelector('.avatar-inner');
    
    // Change from emoji to stylized 'RHEA' text
    if (avatarInner) {
        avatarInner.innerHTML = '<span class="avatar-text">RHEA</span>';
    }
});
