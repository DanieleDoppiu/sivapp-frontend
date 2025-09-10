import { IonApp } from '@ionic/angular/standalone';
import { Component } from '@angular/core';
import { TabsComponent } from './../../tabs.component';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';


@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [CommonModule, IonApp, TabsComponent, IonicModule],
  templateUrl: './privacy-policy.page.html',
  styleUrls: ['./privacy-policy.page.scss'],
})
export class PrivacyPolicyPage {}
