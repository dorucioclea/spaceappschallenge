import { Component, OnInit } from '@angular/core';
import { Coords } from '../models/coords';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { GeoService } from '../services/geo.service';
import { AuthService } from '../services/authentication.service';
import { UserService } from '../services/user.service';
import { Subscription } from 'rxjs';
import { Alert, User } from '../models';
import { AlertController } from '@ionic/angular';

@Component({
    selector: 'app-map',
    templateUrl: './map.component.html',
    styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {

    radiusAlert = 100;
    updateDistance = 2;
    userCoords: Coords = { longitude: null, latitude: null };
    lastSearchCoords: Coords = null;
    alertsSubscription: Subscription = null;
    singleAlerts: Alert[] = [];
    areaAlerts: Alert[] = [];
    user: User;

    constructor(private geolocation: Geolocation, private geo: GeoService, private userService: UserService, private authService: AuthService, private alertController: AlertController) {
    }

    async ngOnInit() {

        this.user = await this.authService.getLoggedInUser();
        this.getUserLocation();
        this.userService.getUser(this.user.uid).valueChanges().subscribe((user) => {
            if (user.notification) {
                this.presentNotification();
            }
        });
    }
    async presentNotification() {
        const alert = await this.alertController.create({
            header: 'Alert near you!',
            subHeader: 'there is a big fire, run!',
            message: 'ARE YOU SAFE?',
            buttons: [{
                text: 'NO',
                role: 'cancel',
                cssClass: 'secondary',
                handler: (blah) => {
                    this.userService.removeNotification(this.user.uid);
                    this.geo.pushAlert();
                }
            }, {
                text: 'YES',
                handler: () => {
                    this.userService.removeNotification(this.user.uid);   
                }
            }]
        });
        await alert.present();
    }

    private getUserLocation() {
        const watch = this.geolocation.watchPosition();
        watch.subscribe((data) => {
            this.userCoords = { latitude: data.coords.latitude, longitude: data.coords.longitude };
            this.subscribeToAlerts();
            this.updateCoords(this.userCoords);
        });
    }

    updateCoords(coords: Coords) {
        this.userService.updateCoords(this.user.uid, coords);
    }

    createAlert() {
        this.geo.pushAlert();
    }

    private subscribeToAlerts() {
        if (!this.lastSearchCoords || this.geo.getDistance(this.userCoords, this.lastSearchCoords) > this.updateDistance) {
            this.lastSearchCoords = this.userCoords;
            if (this.alertsSubscription) {
                this.alertsSubscription.unsubscribe();
            }
            this.singleAlerts = [];
            this.areaAlerts = [];
            this.alertsSubscription = this.geo.getAlerts(this.userCoords, this.radiusAlert).subscribe(documents => {
                documents.forEach(document => {
                    const value: any = document;
                    const alert: Alert = value as Alert;
                    switch (alert.type) {
                        case 'SINGLE': {
                            this.singleAlerts.push(alert);
                            break;
                        }
                        case 'AREA': {
                            this.areaAlerts.push(alert);
                            break;
                        }
                        default: {
                            console.warn('Undefined type of alert: ' + alert.type);
                            break;
                        }
                    }
                });
            });
        }
    }
}
