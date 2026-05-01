import ReportIcon from '@mui/icons-material/Report';
import DangerousIcon from '@mui/icons-material/Dangerous';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';


class Util {
    formatDate(_date) {
        const date = new Date(_date);
        const formattedDate = date.toLocaleString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' });
        return formattedDate;
    };

    formatDateShort(_date) {
        const date = new Date(_date);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        return `${day}/${month}/${year}`;
    };

    getDateFromFirebase(_date) {
        if (!_date) return new Date();
        const milliseconds = _date.seconds * 1000 + Math.floor(_date.nanoseconds / 1e6);
        return new Date(milliseconds);
    };

    getAge(_date) {
        if (!isNaN(_date)) {
            const birthday = new Date(_date);
            const ageDiffMs = Date.now() - birthday.getTime();
            const ageDate = new Date(ageDiffMs);
            const age = Math.abs(ageDate.getUTCFullYear() - 1970);
            return age
        }
    };

    dateExpireColor(_date) {
        const now = new Date();
        const expireDate = new Date(_date);

        const diffMs = expireDate - now;
        const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysLeft < -35) {
            return 'gray'; // ⚪ Inactivo
        }
        if (daysLeft < 0) {
            return '#ff6060'; // 🔴 Vencido
        }
        if (daysLeft <= 7) {
            return '#ffc061'; // 🟠 Próximo a vencer
        }
        if (daysLeft <= 15) {
            return '#a9ff63'; // 🟡 Medio
        }
        return '#70ff63'; // 🟢 Activo
    }

    removeAccents(str) {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };


    calculateIMC(weight_kg, Height_cm) {
        const HeightMeters = Height_cm / 100;
        const imc = weight_kg / (HeightMeters ** 2);
        return imc.toFixed(2);
    }

    idealWeight(height, gender) {
        const idealWeight = gender === 0
            ? (height - 100) - ((height - 100) * 0.1)
            : gender === 1
                ? (height - 100) - ((height - 100) * 0.15)
                : null;

        return idealWeight;
    }


    idealBodyFat(IMC, age, gender) {
        return (1.2 * IMC) + (0.23 * age) - (10.8 * gender) - 5.4;
    }

    copyToClipboard(newClip) {
        if (!navigator.clipboard) {
            console.error('El navegador no admite la API del portapapeles.');
            return;
        }
        return navigator.clipboard.writeText(newClip);
    }



    genId(data) {
        const timestamp = Date.now().toString(36);
        const randomString = Math.random().toString(36).substr(2);
        const additionalData = data.toString();
        const uniqueId = `${timestamp}-${randomString}-${additionalData}`;
        return uniqueId;
    };


    openWAChat({ phone, message = "", countryCode = "506" }) {
    const cleaned = phone.replace(/\D/g, "");
    const fullNumber = `${countryCode}${cleaned}`;
    const text = encodeURIComponent(message);

    const appUrl = `whatsapp://send?phone=${fullNumber}&text=${text}`;
    const webUrl = `https://wa.me/${fullNumber}?text=${text}`;

    window.location.href = appUrl;

    setTimeout(() => {
        window.open(webUrl, "_blank");
    }, 1500);
}

    selectMembershipMessage(name, until) {
        const membershipDate = new Date(this.getDateFromFirebase(until));
        const today = new Date();
        const diffTime = membershipDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `Hola, ${name}. Esperamos que estés muy bien 😊 tu membresía venció el ${membershipDate.toLocaleDateString()} te invitamos a renovarla para continuar con tus entrenamientos 🥊`;
        } else if (diffDays <= 7) {
            return `Hola, ${name}. Esperamos que estés muy bien 😊 tu membresía está por vencerá el ${membershipDate.toLocaleDateString()} podés renovarla en cualquier momento para seguir entrenando 🥊`;
        } else {
            return `Hola, ${name}. Esperamos que estés muy bien 😊 tu membresía ha sido renovada ✅ ya podés continuar entrenando con normalidad 🥊`;
        }
    }


    openURL(url) {
        window.open(url);
    }

    renewMembership(_date) {
        const oldUntil = new Date(this.getDateFromFirebase(_date));
        const today = new Date();
        const oneWeekAgo = new Date(today);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        // If membership expired more than 1 week ago, use today's date
        const baseDate = oldUntil < oneWeekAgo ? today : oldUntil;

        // Add 1 month to the base date
        const newUntil = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, baseDate.getDate());
        return newUntil;
    }

    generateemail(formattedName) {
        return `${formattedName}_${Date.now()}@pulgasboxing.com`;
    }

    formatMailNanme(name) {
        return name ? `${name
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '.') // spaces -> dots
            .replace(/[^a-z0-9.]/g, '')}`
            : `user${Date.now()}`

    }

    isMembershipActive(_date) {
        const currentDate = new Date();
        const membershipDate = new Date(this.getDateFromFirebase(_date));
        return membershipDate >= currentDate;
    }

    isMembershipDisplayable(_date) {
        const currentDate = new Date() -30 * 24 * 60 * 60 * 1000; // 30 days ago
        const membershipDate = new Date(this.getDateFromFirebase(_date));
        return membershipDate >= currentDate;
    }
    
}

export default Util
